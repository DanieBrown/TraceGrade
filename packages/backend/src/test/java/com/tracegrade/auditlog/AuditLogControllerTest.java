package com.tracegrade.auditlog;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

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

import com.tracegrade.config.CorsProperties;
import com.tracegrade.config.CsrfAccessDeniedHandler;
import com.tracegrade.config.CsrfProperties;
import com.tracegrade.config.SecurityConfig;
import com.tracegrade.config.SecurityHeadersProperties;
import com.tracegrade.domain.model.AuditEventType;
import com.tracegrade.dto.response.GradeAuditLogResponse;
import com.tracegrade.filter.SanitizationProperties;
import com.tracegrade.ratelimit.RateLimitProperties;
import com.tracegrade.ratelimit.RateLimitService;

/**
 * WebMvcTest slice tests for {@link AuditLogController}.
 *
 * <p>Covers:
 * <ul>
 *   <li>HTTP 200 — authenticated ADMIN access with various query-param combinations</li>
 *   <li>HTTP 401 — unauthenticated request</li>
 *   <li>HTTP 403 — authenticated non-ADMIN (TEACHER) role</li>
 *   <li>HTTP 400 — startDate after endDate (EC-3)</li>
 *   <li>HTTP 405 — DELETE method not allowed (AC-008)</li>
 * </ul>
 *
 * <p>No Spring context beyond the MVC slice is loaded; {@link AuditLogService} is a
 * {@code @MockBean}.
 */
@WebMvcTest(AuditLogController.class)
@ActiveProfiles("test")
@Import({SecurityConfig.class, SecurityHeadersProperties.class,
         CsrfProperties.class, CsrfAccessDeniedHandler.class,
         CorsProperties.class,
         RateLimitProperties.class, SanitizationProperties.class})
@TestPropertySource(properties = {
        "security-headers.https-redirect-enabled=false",
        "rate-limit.enabled=false",
        "sanitization.enabled=false",
        "csrf.enabled=false"
})
@SuppressWarnings("null")
class AuditLogControllerTest {

    private static final String BASE_URL = "/api/audit/grades";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuditLogService auditLogService;

    @MockBean
    private RateLimitService rateLimitService;

    // ════════════════════════════════════════════════════════════════════════
    // Authentication / authorization gate tests
    // ════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Security — authentication and authorization")
    class SecurityTests {

        @Test
        @DisplayName("GET /api/audit/grades returns 401 when no auth token is supplied")
        void getAuditLogs_returns401_whenUnauthenticated() throws Exception {
            mockMvc.perform(get(BASE_URL))
                    .andExpect(status().isUnauthorized());

            verifyNoInteractions(auditLogService);
        }

        @Test
        @DisplayName("GET /api/audit/grades returns 403 when authenticated as TEACHER (non-ADMIN)")
        void getAuditLogs_returns403_whenTeacherRole() throws Exception {
            mockMvc.perform(get(BASE_URL)
                            .with(user("teacher-user").roles("TEACHER")))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success", is(false)))
                    .andExpect(jsonPath("$.error.code", is("ACCESS_DENIED")));

            verifyNoInteractions(auditLogService);
        }

        @Test
        @DisplayName("GET /api/audit/grades returns 200 when authenticated as ADMIN with no params")
        void getAuditLogs_returns200_whenAdminWithNoParams() throws Exception {
            when(auditLogService.queryAuditLogs(isNull(), isNull(), isNull()))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get(BASE_URL)
                            .with(user("admin-user").roles("ADMIN")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success", is(true)))
                    .andExpect(jsonPath("$.data", hasSize(0)));

            verify(auditLogService).queryAuditLogs(null, null, null);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // Input validation — EC-3 (startDate after endDate)
    // ════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Input validation")
    class ValidationTests {

        @Test
        @DisplayName("GET /api/audit/grades returns 400 when from is after to (EC-3)")
        void getAuditLogs_returns400_whenStartDateAfterEndDate() throws Exception {
            // from (Jan 2) is after to (Jan 1) — violates EC-3
            mockMvc.perform(get(BASE_URL)
                            .with(user("admin-user").roles("ADMIN"))
                            .param("from", "2024-01-02T00:00:00Z")
                            .param("to",   "2024-01-01T00:00:00Z"))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(auditLogService);
        }

        @Test
        @DisplayName("GET /api/audit/grades returns 200 when from equals to (boundary, valid)")
        void getAuditLogs_returns200_whenStartDateEqualsEndDate() throws Exception {
            String sameDate = "2024-06-15T00:00:00Z";
            Instant instant  = Instant.parse(sameDate);

            when(auditLogService.queryAuditLogs(isNull(), eq(instant), eq(instant)))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get(BASE_URL)
                            .with(user("admin-user").roles("ADMIN"))
                            .param("from", sameDate)
                            .param("to",   sameDate))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success", is(true)));
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // Query-param combinations — happy path
    // ════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Query-param forwarding to service")
    class QueryParamTests {

        private static final UUID STUDENT_ID = UUID.randomUUID();
        private static final String FROM_STR = "2024-01-01T00:00:00Z";
        private static final String TO_STR   = "2024-01-31T23:59:59Z";
        private static final Instant FROM     = Instant.parse(FROM_STR);
        private static final Instant TO       = Instant.parse(TO_STR);

        @Test
        @DisplayName("GET /api/audit/grades?studentId={id} delegates studentId to service and returns 200")
        void getAuditLogs_returns200_withStudentId() throws Exception {
            GradeAuditLogResponse entry = GradeAuditLogResponse.builder()
                    .id(UUID.randomUUID())
                    .studentId(STUDENT_ID)
                    .eventType(AuditEventType.AI_GRADING_SUCCESS)
                    .originalAiScore(new BigDecimal("88.00"))
                    .createdAt(Instant.now())
                    .build();

            when(auditLogService.queryAuditLogs(eq(STUDENT_ID), isNull(), isNull()))
                    .thenReturn(List.of(entry));

            mockMvc.perform(get(BASE_URL)
                            .with(user("admin-user").roles("ADMIN"))
                            .param("studentId", STUDENT_ID.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success", is(true)))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].studentId", is(STUDENT_ID.toString())))
                    .andExpect(jsonPath("$.data[0].eventType", is("AI_GRADING_SUCCESS")));

            verify(auditLogService).queryAuditLogs(STUDENT_ID, null, null);
        }

        @Test
        @DisplayName("GET /api/audit/grades?from=&to= delegates date range to service and returns 200")
        void getAuditLogs_returns200_withDateRange() throws Exception {
            when(auditLogService.queryAuditLogs(isNull(), eq(FROM), eq(TO)))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get(BASE_URL)
                            .with(user("admin-user").roles("ADMIN"))
                            .param("from", FROM_STR)
                            .param("to",   TO_STR))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success", is(true)));

            verify(auditLogService).queryAuditLogs(null, FROM, TO);
        }

        @Test
        @DisplayName("GET /api/audit/grades?studentId=&from=&to= delegates all params to service and returns 200")
        void getAuditLogs_returns200_withAllParams() throws Exception {
            when(auditLogService.queryAuditLogs(eq(STUDENT_ID), eq(FROM), eq(TO)))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get(BASE_URL)
                            .with(user("admin-user").roles("ADMIN"))
                            .param("studentId",  STUDENT_ID.toString())
                            .param("from", FROM_STR)
                            .param("to",   TO_STR))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success", is(true)));

            verify(auditLogService).queryAuditLogs(STUDENT_ID, FROM, TO);
        }

        @Test
        @DisplayName("GET /api/audit/grades with no params returns 200 (EC-4: all records)")
        void getAuditLogs_returns200_withNoParams() throws Exception {
            GradeAuditLogResponse entry1 = GradeAuditLogResponse.builder()
                    .id(UUID.randomUUID())
                    .eventType(AuditEventType.AI_GRADING_FAILURE)
                    .createdAt(Instant.now())
                    .build();
            GradeAuditLogResponse entry2 = GradeAuditLogResponse.builder()
                    .id(UUID.randomUUID())
                    .eventType(AuditEventType.TEACHER_OVERRIDE)
                    .createdAt(Instant.now())
                    .build();

            when(auditLogService.queryAuditLogs(isNull(), isNull(), isNull()))
                    .thenReturn(List.of(entry1, entry2));

            mockMvc.perform(get(BASE_URL)
                            .with(user("admin-user").roles("ADMIN")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success", is(true)))
                    .andExpect(jsonPath("$.data", hasSize(2)));

            verify(auditLogService).queryAuditLogs(null, null, null);
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // Method-not-allowed — AC-008 (no mutating endpoints)
    // ════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Mutating HTTP methods not supported (AC-008)")
    class MethodNotAllowedTests {

        @Test
        @DisplayName("DELETE /api/audit/grades returns 405 when called by ADMIN (no delete endpoint exists)")
        void deleteAuditGrades_returns405_whenAdminAuthenticated() throws Exception {
            mockMvc.perform(delete(BASE_URL)
                            .with(user("admin-user").roles("ADMIN")))
                    .andExpect(status().isMethodNotAllowed());

            verifyNoInteractions(auditLogService);
        }
    }
}
