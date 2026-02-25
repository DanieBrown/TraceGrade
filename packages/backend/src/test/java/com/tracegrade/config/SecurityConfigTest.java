package com.tracegrade.config;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.tracegrade.dashboard.DashboardStatsController;
import com.tracegrade.dashboard.DashboardStatsService;
import com.tracegrade.examtemplate.ExamTemplateService;
import com.tracegrade.filter.SanitizationProperties;
import com.tracegrade.grading.GradingService;
import com.tracegrade.ratelimit.RateLimitProperties;
import com.tracegrade.ratelimit.RateLimitService;
import com.tracegrade.rubric.AnswerRubricService;
import com.tracegrade.submission.SubmissionUploadService;

@WebMvcTest({DashboardStatsController.class, com.tracegrade.examtemplate.ExamTemplateController.class})
@ActiveProfiles("test")
@Import({SecurityConfig.class, SecurityHeadersProperties.class,
         CsrfProperties.class, CsrfAccessDeniedHandler.class,
         CorsProperties.class,
         RateLimitProperties.class, SanitizationProperties.class})
@TestPropertySource(properties = {
        "security-headers.https-redirect-enabled=false",
        "rate-limit.enabled=false",
        "sanitization.enabled=false",
        "csrf.enabled=true",
        "csrf.cookie-secure=false"
})
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RateLimitService rateLimitService;

    @MockBean
    private GradingService gradingService;

    @MockBean
    private AnswerRubricService answerRubricService;

    @MockBean
    private SubmissionUploadService submissionUploadService;

    @MockBean
    private DashboardStatsService dashboardStatsService;

    @MockBean
    private ExamTemplateService examTemplateService;

    @Nested
    @DisplayName("Security Headers")
    class SecurityHeaderTests {

        @Test
        @DisplayName("Should include X-Content-Type-Options: nosniff header")
        void shouldIncludeContentTypeOptions() throws Exception {
            mockMvc.perform(get("/any-path"))
                    .andExpect(header().string("X-Content-Type-Options", "nosniff"));
        }

        @Test
        @DisplayName("Should include X-Frame-Options: SAMEORIGIN header")
        void shouldIncludeFrameOptions() throws Exception {
            mockMvc.perform(get("/any-path"))
                    .andExpect(header().string("X-Frame-Options", "SAMEORIGIN"));
        }

        @Test
        @DisplayName("Should include Content-Security-Policy header")
        void shouldIncludeCSP() throws Exception {
            mockMvc.perform(get("/any-path"))
                    .andExpect(header().exists("Content-Security-Policy"))
                    .andExpect(header().string("Content-Security-Policy",
                            containsString("default-src 'self'")));
        }

        @Test
        @DisplayName("Should include Strict-Transport-Security header on secure requests")
        void shouldIncludeHSTS() throws Exception {
            mockMvc.perform(get("/any-path").secure(true))
                    .andExpect(header().string("Strict-Transport-Security",
                            containsString("max-age=31536000")));
        }

        @Test
        @DisplayName("Should include Referrer-Policy header")
        void shouldIncludeReferrerPolicy() throws Exception {
            mockMvc.perform(get("/any-path"))
                    .andExpect(header().string("Referrer-Policy",
                            "strict-origin-when-cross-origin"));
        }

        @Test
        @DisplayName("Should include Permissions-Policy header")
        void shouldIncludePermissionsPolicy() throws Exception {
            mockMvc.perform(get("/any-path"))
                    .andExpect(header().exists("Permissions-Policy"))
                    .andExpect(header().string("Permissions-Policy",
                            containsString("camera=()")));
        }

        @Test
        @DisplayName("Should include all security headers in a single secure response")
        void shouldIncludeAllHeaders() throws Exception {
            mockMvc.perform(get("/any-path").secure(true))
                    .andExpect(header().exists("X-Content-Type-Options"))
                    .andExpect(header().exists("X-Frame-Options"))
                    .andExpect(header().exists("Content-Security-Policy"))
                    .andExpect(header().exists("Strict-Transport-Security"))
                    .andExpect(header().exists("Referrer-Policy"))
                    .andExpect(header().exists("Permissions-Policy"));
        }
    }

    @Nested
    @DisplayName("HTTPS Redirect")
    class HttpsRedirectTests {

        @Test
        @DisplayName("Should not redirect when https-redirect-enabled is false")
        void shouldNotRedirectWhenDisabled() throws Exception {
            // With anyRequest().authenticated(), an unauthenticated request
            // to an unknown path returns 401 (not a 302 redirect to HTTPS).
            mockMvc.perform(get("/any-path"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("Endpoint Authorization")
    class EndpointAuthorizationTests {

        @Test
        @DisplayName("Should require authentication for unknown endpoints (fail-closed)")
        void shouldRequireAuthenticationForUnknownEndpoints() throws Exception {
            mockMvc.perform(get("/api/some-unknown-endpoint"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Should allow unauthenticated access to CSRF token endpoint")
        void shouldAllowCsrfTokenEndpointWithoutAuth() throws Exception {
            int status = mockMvc.perform(get("/api/csrf/token"))
                    .andReturn().getResponse().getStatus();
            // Should not be 401 or 403 — this endpoint is explicitly public
            org.assertj.core.api.Assertions.assertThat(status).isNotIn(401, 403);
        }

        @Test
        @DisplayName("Should require authentication for exam-template endpoints")
        void shouldRequireAuthenticationForExamTemplateEndpoints() throws Exception {
            mockMvc.perform(get("/api/exam-templates"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("Should allow authenticated access path for exam-template endpoints")
        void shouldAllowAuthenticatedAccessPathForExamTemplateEndpoints() throws Exception {
            // Use a valid UUID so resolveTeacherId() succeeds. The service is a mock,
            // so the response may vary; we only verify the security layer doesn't block.
            int status = mockMvc.perform(get("/api/exam-templates")
                            .with(user("00000000-0000-4000-a000-000000000099")))
                    .andReturn().getResponse().getStatus();
            // Not 401 (unauthenticated) and not 403 (forbidden) means security passed
            org.assertj.core.api.Assertions.assertThat(status).isNotIn(401, 403);
        }
    }
}
