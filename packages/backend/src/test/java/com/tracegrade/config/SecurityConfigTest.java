package com.tracegrade.config;

import static org.hamcrest.Matchers.containsString;
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
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.tracegrade.ratelimit.RateLimitProperties;
import com.tracegrade.ratelimit.RateLimitService;

@WebMvcTest
@Import({SecurityConfig.class, SecurityHeadersProperties.class, RateLimitProperties.class})
@TestPropertySource(properties = {
        "security-headers.https-redirect-enabled=false",
        "rate-limit.enabled=false"
})
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RateLimitService rateLimitService;

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
            mockMvc.perform(get("/any-path"))
                    .andExpect(status().isNotFound());
        }
    }
}
