package com.tracegrade.dashboard;

import static org.hamcrest.Matchers.is;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.tracegrade.config.CsrfAccessDeniedHandler;
import com.tracegrade.config.CsrfProperties;
import com.tracegrade.config.SecurityConfig;
import com.tracegrade.config.SecurityHeadersProperties;
import com.tracegrade.dto.response.DashboardStatsResponse;
import com.tracegrade.exception.ResourceNotFoundException;
import com.tracegrade.filter.SanitizationProperties;
import com.tracegrade.ratelimit.RateLimitProperties;
import com.tracegrade.ratelimit.RateLimitService;

@WebMvcTest(DashboardStatsController.class)
@Import({SecurityConfig.class, SecurityHeadersProperties.class,
         CsrfProperties.class, CsrfAccessDeniedHandler.class,
         RateLimitProperties.class, SanitizationProperties.class})
@TestPropertySource(properties = {
        "security-headers.https-redirect-enabled=false",
        "rate-limit.enabled=false",
        "sanitization.enabled=false",
        "csrf.enabled=false"
})
@SuppressWarnings("null")
class DashboardStatsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DashboardStatsService dashboardStatsService;

    @MockBean
    private RateLimitService rateLimitService;

    @Test
    @DisplayName("GET dashboard stats returns 401 when unauthenticated")
    void returnsUnauthorizedWhenUnauthenticated() throws Exception {
        UUID schoolId = UUID.randomUUID();

        mockMvc.perform(get("/api/schools/{schoolId}/dashboard/stats", schoolId))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(dashboardStatsService);
    }

    @Test
    @DisplayName("GET dashboard stats returns 200 with ApiResponse envelope when authenticated")
    void returnsDashboardStatsWhenAuthenticated() throws Exception {
        UUID schoolId = UUID.randomUUID();
        DashboardStatsResponse response = DashboardStatsResponse.builder()
                .totalStudents(20)
                .classCount(0)
                .gradedThisWeek(8)
                .pendingReviews(2)
                .classAverage(new BigDecimal("84.7"))
                .letterGrade("B")
                .build();

        when(dashboardStatsService.getDashboardStats(schoolId)).thenReturn(response);

        mockMvc.perform(get("/api/schools/{schoolId}/dashboard/stats", schoolId)
                        .with(user(schoolId.toString())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.totalStudents", is(20)))
                .andExpect(jsonPath("$.data.classCount", is(0)))
                .andExpect(jsonPath("$.data.gradedThisWeek", is(8)))
                .andExpect(jsonPath("$.data.pendingReviews", is(2)))
                .andExpect(jsonPath("$.data.classAverage", is(84.7)))
                .andExpect(jsonPath("$.data.letterGrade", is("B")));

        verify(dashboardStatsService).getDashboardStats(schoolId);
    }

        @Test
        @DisplayName("GET dashboard stats returns 200 with zero defaults for valid empty school")
        void returnsZeroDefaultsForValidEmptySchool() throws Exception {
                UUID schoolId = UUID.randomUUID();
                DashboardStatsResponse response = DashboardStatsResponse.builder()
                                .totalStudents(0)
                                .classCount(0)
                                .gradedThisWeek(0)
                                .pendingReviews(0)
                                .classAverage(new BigDecimal("0.0"))
                                .letterGrade("F")
                                .build();

                when(dashboardStatsService.getDashboardStats(schoolId)).thenReturn(response);

                mockMvc.perform(get("/api/schools/{schoolId}/dashboard/stats", schoolId)
                                                .with(user(schoolId.toString())))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success", is(true)))
                                .andExpect(jsonPath("$.data.totalStudents", is(0)))
                                .andExpect(jsonPath("$.data.classCount", is(0)))
                                .andExpect(jsonPath("$.data.gradedThisWeek", is(0)))
                                .andExpect(jsonPath("$.data.pendingReviews", is(0)))
                                .andExpect(jsonPath("$.data.classAverage", is(0.0)))
                                .andExpect(jsonPath("$.data.letterGrade", is("F")));

                verify(dashboardStatsService).getDashboardStats(schoolId);
        }

    @Test
        @DisplayName("GET dashboard stats returns 403 when authenticated user is not authorized for school")
        void returnsForbiddenWhenSchoolAccessUnauthorized() throws Exception {
                UUID schoolId = UUID.randomUUID();

                mockMvc.perform(get("/api/schools/{schoolId}/dashboard/stats", schoolId)
                                                .with(user(UUID.randomUUID().toString())))
                                .andExpect(status().isForbidden())
                                .andExpect(jsonPath("$.success", is(false)))
                                .andExpect(jsonPath("$.error.code", is("ACCESS_DENIED")));

                verifyNoInteractions(dashboardStatsService);
        }

        @Test
        @DisplayName("GET dashboard stats returns 404 when school does not exist")
    void returnsNotFoundWhenSchoolMissing() throws Exception {
        UUID schoolId = UUID.randomUUID();
        when(dashboardStatsService.getDashboardStats(schoolId))
                .thenThrow(new ResourceNotFoundException("School", schoolId));

                mockMvc.perform(get("/api/schools/{schoolId}/dashboard/stats", schoolId)
                                                .with(user(schoolId.toString())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("NOT_FOUND")));

        verify(dashboardStatsService).getDashboardStats(schoolId);
    }

    @Test
    @DisplayName("GET dashboard stats returns 400 when schoolId is invalid UUID")
    void returnsBadRequestWhenSchoolIdInvalid() throws Exception {
        mockMvc.perform(get("/api/schools/{schoolId}/dashboard/stats", "invalid-uuid")
                        .with(user(UUID.randomUUID().toString())))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(dashboardStatsService);
    }
}