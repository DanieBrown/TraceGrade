package com.tracegrade.config;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.head;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.filter.SanitizationProperties;
import com.tracegrade.ratelimit.RateLimitProperties;
import com.tracegrade.ratelimit.RateLimitService;

@WebMvcTest(controllers = CsrfProtectionTest.TestController.class)
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
class CsrfProtectionTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RateLimitService rateLimitService;

    @RestController
    static class TestController {

        @GetMapping("/test/csrf/get")
        public ApiResponse<String> doGet() {
            return ApiResponse.success("get-ok");
        }

        @PostMapping("/test/csrf/post")
        public ApiResponse<String> doPost() {
            return ApiResponse.success("post-ok");
        }

        @PutMapping("/test/csrf/put")
        public ApiResponse<String> doPut() {
            return ApiResponse.success("put-ok");
        }

        @DeleteMapping("/test/csrf/delete")
        public ApiResponse<String> doDelete() {
            return ApiResponse.success("delete-ok");
        }
    }

    @Nested
    @DisplayName("CSRF Token Generation")
    class TokenGenerationTests {

        @Test
        @DisplayName("Should set XSRF-TOKEN cookie on GET requests")
        void shouldSetCsrfCookieOnGet() throws Exception {
            // Spring Security 6.2+ writes the CSRF cookie via response.addHeader("Set-Cookie", ...)
            // using ResponseCookie (for SameSite support). Spring Test 6.1.x MockHttpServletResponse
            // does not expose those Set-Cookie headers through getCookie(), so we assert on the
            // header directly instead of using cookie().exists().
            mockMvc.perform(get("/test/csrf/get")
                            .with(user("test-user")))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Set-Cookie", containsString("XSRF-TOKEN=")))
                    .andExpect(header().string("Set-Cookie", containsString("Path=/")));
        }

        @Test
        @DisplayName("Should not require CSRF token for GET requests")
        void shouldNotRequireCsrfForGet() throws Exception {
            mockMvc.perform(get("/test/csrf/get")
                            .with(user("test-user")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success", is(true)));
        }
    }

    @Nested
    @DisplayName("CSRF Token Validation")
    class TokenValidationTests {

        @Test
        @DisplayName("Should reject POST without CSRF token")
        void shouldRejectPostWithoutToken() throws Exception {
            mockMvc.perform(post("/test/csrf/post")
                            .with(user("test-user"))
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success", is(false)))
                    .andExpect(jsonPath("$.error.code", is("CSRF_TOKEN_MISSING")));
        }

        @Test
        @DisplayName("Should accept POST with valid CSRF token")
        void shouldAcceptPostWithValidToken() throws Exception {
            mockMvc.perform(post("/test/csrf/post")
                            .with(user("test-user"))
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success", is(true)));
        }

        @Test
        @DisplayName("Should reject PUT without CSRF token")
        void shouldRejectPutWithoutToken() throws Exception {
            mockMvc.perform(put("/test/csrf/put")
                            .with(user("test-user"))
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Should accept PUT with valid CSRF token")
        void shouldAcceptPutWithValidToken() throws Exception {
            mockMvc.perform(put("/test/csrf/put")
                            .with(user("test-user"))
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should reject DELETE without CSRF token")
        void shouldRejectDeleteWithoutToken() throws Exception {
            mockMvc.perform(delete("/test/csrf/delete")
                            .with(user("test-user")))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("Should accept DELETE with valid CSRF token")
        void shouldAcceptDeleteWithValidToken() throws Exception {
            mockMvc.perform(delete("/test/csrf/delete")
                            .with(user("test-user"))
                            .with(csrf()))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should reject POST with invalid CSRF token")
        void shouldRejectPostWithInvalidToken() throws Exception {
            mockMvc.perform(post("/test/csrf/post")
                            .with(user("test-user"))
                            .with(csrf().useInvalidToken())
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.error.code", is("CSRF_TOKEN_INVALID")));
        }
    }

    @Nested
    @DisplayName("CSRF Exemptions")
    class ExemptionTests {

        @Test
        @DisplayName("Should not require CSRF for HEAD requests")
        void shouldNotRequireForHead() throws Exception {
            mockMvc.perform(head("/test/csrf/get")
                            .with(user("test-user")))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should not require CSRF for OPTIONS requests")
        void shouldNotRequireForOptions() throws Exception {
            mockMvc.perform(options("/test/csrf/get")
                            .with(user("test-user")))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("Should exempt actuator endpoints from CSRF")
        void shouldExemptActuator() throws Exception {
            // POST to actuator should return 404 (not found), not 403 (forbidden)
            mockMvc.perform(post("/actuator/health")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("CSRF Error Response Format")
    class ErrorResponseTests {

        @Test
        @DisplayName("Should return standard ApiResponse format for CSRF errors")
        void shouldReturnApiResponseFormat() throws Exception {
            mockMvc.perform(post("/test/csrf/post")
                            .with(user("test-user"))
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success", is(false)))
                    .andExpect(jsonPath("$.error.code").exists())
                    .andExpect(jsonPath("$.error.message").exists())
                    .andExpect(jsonPath("$.error.timestamp").exists());
        }
    }
}
