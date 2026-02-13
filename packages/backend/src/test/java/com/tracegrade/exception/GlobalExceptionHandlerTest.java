package com.tracegrade.exception;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tracegrade.config.CsrfAccessDeniedHandler;
import com.tracegrade.config.CsrfProperties;
import com.tracegrade.config.SecurityConfig;
import com.tracegrade.config.SecurityHeadersProperties;
import com.tracegrade.dto.request.CreateExamTemplateRequest;
import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.filter.SanitizationProperties;
import com.tracegrade.ratelimit.RateLimitProperties;
import com.tracegrade.ratelimit.RateLimitService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;

@WebMvcTest(controllers = GlobalExceptionHandlerTest.TestController.class)
@Import({SecurityConfig.class, SecurityHeadersProperties.class,
         CsrfProperties.class, CsrfAccessDeniedHandler.class,
         RateLimitProperties.class, SanitizationProperties.class,
         GlobalExceptionHandler.class})
@TestPropertySource(properties = {
        "security-headers.https-redirect-enabled=false",
        "rate-limit.enabled=false",
        "sanitization.enabled=false",
        "csrf.enabled=true",
        "csrf.cookie-secure=false"
})
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RateLimitService rateLimitService;

    @RestController
    @Validated
    static class TestController {

        @PostMapping("/test/validate")
        public ApiResponse<String> validate(@Valid @RequestBody CreateExamTemplateRequest request) {
            return ApiResponse.success("ok");
        }

        @GetMapping("/test/not-found")
        public ApiResponse<String> notFound() {
            throw new ResourceNotFoundException("ExamTemplate", UUID.randomUUID());
        }

        @GetMapping("/test/error")
        public ApiResponse<String> error() {
            throw new RuntimeException("Something went wrong");
        }

        @GetMapping("/test/file-validation")
        public ApiResponse<String> fileValidation() {
            throw new FileValidationException("file", "INVALID_TYPE", "File type not allowed");
        }

        @GetMapping("/test/sanitization")
        public ApiResponse<String> sanitization() {
            throw new InputSanitizationException("Input contains potentially malicious content");
        }

        @GetMapping("/test/param")
        public ApiResponse<String> withParam(@RequestParam @Min(1) int page) {
            return ApiResponse.success("page: " + page);
        }
    }

    @Nested
    @DisplayName("Validation Error Handling")
    class ValidationTests {

        @Test
        @DisplayName("Should return 400 with VALIDATION_ERROR for invalid request body")
        void shouldReturn400ForValidationErrors() throws Exception {
            mockMvc.perform(post("/test/validate")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success", is(false)))
                    .andExpect(jsonPath("$.error.code", is("VALIDATION_ERROR")))
                    .andExpect(jsonPath("$.error.message", is("Request validation failed")))
                    .andExpect(jsonPath("$.error.details").isArray())
                    .andExpect(jsonPath("$.error.timestamp").exists());
        }

        @Test
        @DisplayName("Should return field-level details for each violated constraint")
        void shouldReturnFieldDetails() throws Exception {
            mockMvc.perform(post("/test/validate")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error.details").isArray())
                    .andExpect(jsonPath("$.error.details[*].field").exists())
                    .andExpect(jsonPath("$.error.details[*].message").exists());
        }
    }

    @Nested
    @DisplayName("Not Found Error Handling")
    class NotFoundTests {

        @Test
        @DisplayName("Should return 404 with NOT_FOUND code")
        void shouldReturn404() throws Exception {
            mockMvc.perform(get("/test/not-found"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.success", is(false)))
                    .andExpect(jsonPath("$.error.code", is("NOT_FOUND")))
                    .andExpect(jsonPath("$.error.message").value(
                            org.hamcrest.Matchers.containsString("ExamTemplate not found")));
        }
    }

    @Nested
    @DisplayName("Malformed Request Handling")
    class MalformedRequestTests {

        @Test
        @DisplayName("Should return 400 with INVALID_REQUEST for malformed JSON")
        void shouldReturn400ForMalformedJson() throws Exception {
            mockMvc.perform(post("/test/validate")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{invalid json"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success", is(false)))
                    .andExpect(jsonPath("$.error.code", is("INVALID_REQUEST")));
        }
    }

    @Nested
    @DisplayName("File Validation Error Handling")
    class FileValidationTests {

        @Test
        @DisplayName("Should return 400 with FILE_VALIDATION_ERROR")
        void shouldReturn400ForFileValidation() throws Exception {
            mockMvc.perform(get("/test/file-validation"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success", is(false)))
                    .andExpect(jsonPath("$.error.code", is("FILE_VALIDATION_ERROR")))
                    .andExpect(jsonPath("$.error.details", hasSize(1)))
                    .andExpect(jsonPath("$.error.details[0].field", is("file")));
        }
    }

    @Nested
    @DisplayName("Sanitization Error Handling")
    class SanitizationTests {

        @Test
        @DisplayName("Should return 400 with INVALID_INPUT for sanitization rejection")
        void shouldReturn400ForSanitization() throws Exception {
            mockMvc.perform(get("/test/sanitization"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success", is(false)))
                    .andExpect(jsonPath("$.error.code", is("INVALID_INPUT")));
        }
    }

    @Nested
    @DisplayName("Internal Error Handling")
    class InternalErrorTests {

        @Test
        @DisplayName("Should return 500 with INTERNAL_ERROR for unhandled exceptions")
        void shouldReturn500ForUnhandledException() throws Exception {
            mockMvc.perform(get("/test/error"))
                    .andExpect(status().isInternalServerError())
                    .andExpect(jsonPath("$.success", is(false)))
                    .andExpect(jsonPath("$.error.code", is("INTERNAL_ERROR")));
        }

        @Test
        @DisplayName("Should not leak exception details in 500 responses")
        void shouldNotLeakDetails() throws Exception {
            mockMvc.perform(get("/test/error"))
                    .andExpect(status().isInternalServerError())
                    .andExpect(jsonPath("$.error.message", is("An unexpected error occurred")));
        }
    }
}
