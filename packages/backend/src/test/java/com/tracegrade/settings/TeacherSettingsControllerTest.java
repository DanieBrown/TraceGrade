package com.tracegrade.settings;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tracegrade.exception.GlobalExceptionHandler;
import com.tracegrade.settings.dto.request.UpdateTeacherThresholdRequest;
import com.tracegrade.settings.dto.response.TeacherThresholdResponse;

@SuppressWarnings("null")
class TeacherSettingsControllerTest {

    private MockMvc mockMvc;
    private TeacherThresholdService teacherThresholdService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        teacherThresholdService = mock(TeacherThresholdService.class);
        TeacherSettingsController controller = new TeacherSettingsController(teacherThresholdService);
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();

        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("GET returns effective threshold payload in ApiResponse envelope")
    void getCurrentTeacherThresholdReturnsOk() throws Exception {
        UUID teacherId = UUID.randomUUID();
        TeacherThresholdResponse response = TeacherThresholdResponse.builder()
                .effectiveThreshold(new BigDecimal("0.80"))
                .source("default")
                .teacherThreshold(null)
                .build();

        when(teacherThresholdService.getCurrentTeacherThreshold(any(Authentication.class))).thenReturn(response);

        mockMvc.perform(get("/api/teachers/me/grading-threshold")
                        .principal(principal(teacherId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.effectiveThreshold", is(0.8)))
                .andExpect(jsonPath("$.data.source", is("default")))
                                .andExpect(jsonPath("$.data.teacherThreshold", nullValue()));

        verify(teacherThresholdService).getCurrentTeacherThreshold(any(Authentication.class));
    }

    @Test
    @DisplayName("PUT returns 200 and updates authenticated teacher threshold")
    void updateCurrentTeacherThresholdReturnsOk() throws Exception {
        UUID teacherId = UUID.randomUUID();
        UpdateTeacherThresholdRequest request = UpdateTeacherThresholdRequest.builder()
                .threshold(new BigDecimal("0.85"))
                .build();

        TeacherThresholdResponse response = TeacherThresholdResponse.builder()
                .effectiveThreshold(new BigDecimal("0.85"))
                .source("teacher_override")
                .teacherThreshold(new BigDecimal("0.85"))
                .build();

        when(teacherThresholdService.updateCurrentTeacherThreshold(any(Authentication.class), eq(new BigDecimal("0.85"))))
                .thenReturn(response);

        mockMvc.perform(put("/api/teachers/me/grading-threshold")
                        .principal(principal(teacherId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.effectiveThreshold", is(0.85)))
                .andExpect(jsonPath("$.data.source", is("teacher_override")))
                .andExpect(jsonPath("$.data.teacherThreshold", is(0.85)));

        verify(teacherThresholdService).updateCurrentTeacherThreshold(any(Authentication.class), eq(new BigDecimal("0.85")));
    }

    @Test
    @DisplayName("PUT returns 400 when threshold has more than 2 decimal places")
    void updateCurrentTeacherThresholdReturnsBadRequestForScaleOverflow() throws Exception {
        UUID teacherId = UUID.randomUUID();

        mockMvc.perform(put("/api/teachers/me/grading-threshold")
                        .principal(principal(teacherId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"threshold\":0.801}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("VALIDATION_ERROR")));

        verifyNoInteractions(teacherThresholdService);
    }

    @Test
    @DisplayName("PUT returns 400 when threshold is null")
    void updateCurrentTeacherThresholdReturnsBadRequestForNullThreshold() throws Exception {
        UUID teacherId = UUID.randomUUID();

        mockMvc.perform(put("/api/teachers/me/grading-threshold")
                        .principal(principal(teacherId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"threshold\":null}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("VALIDATION_ERROR")));

        verifyNoInteractions(teacherThresholdService);
    }

    @Test
    @DisplayName("PUT returns 400 when threshold is below 0.00")
    void updateCurrentTeacherThresholdReturnsBadRequestForBelowMinimum() throws Exception {
        UUID teacherId = UUID.randomUUID();

        mockMvc.perform(put("/api/teachers/me/grading-threshold")
                        .principal(principal(teacherId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"threshold\":-0.01}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("VALIDATION_ERROR")));

        verifyNoInteractions(teacherThresholdService);
    }

    @Test
    @DisplayName("PUT returns 400 when threshold is above 1.00")
    void updateCurrentTeacherThresholdReturnsBadRequestForAboveMaximum() throws Exception {
        UUID teacherId = UUID.randomUUID();

        mockMvc.perform(put("/api/teachers/me/grading-threshold")
                        .principal(principal(teacherId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"threshold\":1.01}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("VALIDATION_ERROR")));

        verifyNoInteractions(teacherThresholdService);
    }

    @Test
    @DisplayName("PUT accepts boundary threshold 0.00")
    void updateCurrentTeacherThresholdAcceptsZeroBoundary() throws Exception {
        UUID teacherId = UUID.randomUUID();
        UpdateTeacherThresholdRequest request = UpdateTeacherThresholdRequest.builder()
                .threshold(new BigDecimal("0.00"))
                .build();

        TeacherThresholdResponse response = TeacherThresholdResponse.builder()
                .effectiveThreshold(new BigDecimal("0.00"))
                .source("teacher_override")
                .teacherThreshold(new BigDecimal("0.00"))
                .build();

        when(teacherThresholdService.updateCurrentTeacherThreshold(any(Authentication.class), eq(new BigDecimal("0.00"))))
                .thenReturn(response);

        mockMvc.perform(put("/api/teachers/me/grading-threshold")
                        .principal(principal(teacherId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.effectiveThreshold", is(0.0)))
                .andExpect(jsonPath("$.data.source", is("teacher_override")))
                .andExpect(jsonPath("$.data.teacherThreshold", is(0.0)));

        verify(teacherThresholdService).updateCurrentTeacherThreshold(any(Authentication.class), eq(new BigDecimal("0.00")));
    }

    @Test
    @DisplayName("PUT accepts boundary threshold 1.00")
    void updateCurrentTeacherThresholdAcceptsOneBoundary() throws Exception {
        UUID teacherId = UUID.randomUUID();
        UpdateTeacherThresholdRequest request = UpdateTeacherThresholdRequest.builder()
                .threshold(new BigDecimal("1.00"))
                .build();

        TeacherThresholdResponse response = TeacherThresholdResponse.builder()
                .effectiveThreshold(new BigDecimal("1.00"))
                .source("teacher_override")
                .teacherThreshold(new BigDecimal("1.00"))
                .build();

        when(teacherThresholdService.updateCurrentTeacherThreshold(any(Authentication.class), eq(new BigDecimal("1.00"))))
                .thenReturn(response);

        mockMvc.perform(put("/api/teachers/me/grading-threshold")
                        .principal(principal(teacherId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.effectiveThreshold", is(1.0)))
                .andExpect(jsonPath("$.data.source", is("teacher_override")))
                .andExpect(jsonPath("$.data.teacherThreshold", is(1.0)));

        verify(teacherThresholdService).updateCurrentTeacherThreshold(any(Authentication.class), eq(new BigDecimal("1.00")));
    }

    private static Authentication principal(UUID teacherId) {
        return new UsernamePasswordAuthenticationToken(teacherId.toString(), "N/A", List.of());
    }
}
