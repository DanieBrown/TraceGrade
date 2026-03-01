package com.tracegrade.grade;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tracegrade.config.CorsProperties;
import com.tracegrade.config.CsrfAccessDeniedHandler;
import com.tracegrade.config.CsrfProperties;
import com.tracegrade.config.SecurityConfig;
import com.tracegrade.config.SecurityHeadersProperties;
import com.tracegrade.domain.model.GradeStatus;
import com.tracegrade.dto.request.BulkCreateGradesRequest;
import com.tracegrade.dto.request.CreateGradeRequest;
import com.tracegrade.dto.request.UpdateGradeRequest;
import com.tracegrade.dto.response.GradeResponse;
import com.tracegrade.exception.DuplicateResourceException;
import com.tracegrade.exception.ResourceNotFoundException;
import com.tracegrade.filter.SanitizationProperties;
import com.tracegrade.ratelimit.RateLimitProperties;
import com.tracegrade.ratelimit.RateLimitService;

@WebMvcTest(GradeController.class)
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
class GradeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private GradeService gradeService;

    @MockBean
    private RateLimitService rateLimitService;

    private static final String BASE_URL =
            "/api/schools/{schoolId}/classes/{classId}/assignments/{assignmentId}/grades";

    // ---- GET /grades ----

    @Test
    @DisplayName("GET grades returns 200 with list of grades")
    void listGrades_returns200WithList() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        List<GradeResponse> grades = List.of(
                GradeResponse.builder().id(UUID.randomUUID()).assignmentId(assignmentId)
                        .studentId(UUID.randomUUID()).status(GradeStatus.GRADED)
                        .pointsEarned(BigDecimal.valueOf(85)).build(),
                GradeResponse.builder().id(UUID.randomUUID()).assignmentId(assignmentId)
                        .studentId(UUID.randomUUID()).status(GradeStatus.PENDING).build()
        );

        when(gradeService.listGradesByAssignment(eq(schoolId), eq(classId), eq(assignmentId)))
                .thenReturn(grades);

        mockMvc.perform(get(BASE_URL, schoolId, classId, assignmentId)
                        .with(user(schoolId.toString())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(2)));

        verify(gradeService).listGradesByAssignment(schoolId, classId, assignmentId);
    }

    @Test
    @DisplayName("GET grades returns 401 when unauthenticated")
    void listGrades_returns401WhenUnauthenticated() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        mockMvc.perform(get(BASE_URL, schoolId, classId, assignmentId))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(gradeService);
    }

    @Test
    @DisplayName("GET grades returns 403 when authenticated as different school")
    void listGrades_returns403WhenDifferentSchool() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID differentSchoolId = UUID.randomUUID();

        mockMvc.perform(get(BASE_URL, schoolId, classId, assignmentId)
                        .with(user(differentSchoolId.toString())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ACCESS_DENIED")));

        verifyNoInteractions(gradeService);
    }

    @Test
    @DisplayName("GET grades returns 404 when assignment not found")
    void listGrades_returns404WhenAssignmentNotFound() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        when(gradeService.listGradesByAssignment(any(), any(), any()))
                .thenThrow(new ResourceNotFoundException("Assignment", assignmentId));

        mockMvc.perform(get(BASE_URL, schoolId, classId, assignmentId)
                        .with(user(schoolId.toString())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("NOT_FOUND")));
    }

    // ---- POST /grades ----

    @Test
    @DisplayName("POST grades returns 201 with created grade")
    void createGrade_returns201OnSuccess() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID gradeId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        CreateGradeRequest request = CreateGradeRequest.builder()
                .studentId(studentId)
                .status(GradeStatus.GRADED)
                .pointsEarned(BigDecimal.valueOf(85))
                .build();

        GradeResponse response = GradeResponse.builder()
                .id(gradeId).assignmentId(assignmentId).studentId(studentId)
                .status(GradeStatus.GRADED).pointsEarned(BigDecimal.valueOf(85))
                .build();

        when(gradeService.createGrade(eq(schoolId), eq(classId), eq(assignmentId), any(CreateGradeRequest.class)))
                .thenReturn(response);

        mockMvc.perform(post(BASE_URL, schoolId, classId, assignmentId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.studentId", is(studentId.toString())))
                .andExpect(jsonPath("$.data.status", is("GRADED")));

        verify(gradeService).createGrade(eq(schoolId), eq(classId), eq(assignmentId), any(CreateGradeRequest.class));
    }

    @Test
    @DisplayName("POST grades returns 400 when request body is invalid (missing required fields)")
    void createGrade_returns400WhenInvalidRequest() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        // Missing studentId and status
        mockMvc.perform(post(BASE_URL, schoolId, classId, assignmentId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(gradeService);
    }

    @Test
    @DisplayName("POST grades returns 400 when pointsEarned is negative")
    void createGrade_returns400WhenNegativePoints() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        String body = String.format(
                "{\"studentId\":\"%s\",\"status\":\"GRADED\",\"pointsEarned\":-5.0}",
                studentId);

        mockMvc.perform(post(BASE_URL, schoolId, classId, assignmentId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(gradeService);
    }

    @Test
    @DisplayName("POST grades returns 401 when unauthenticated")
    void createGrade_returns401WhenUnauthenticated() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        CreateGradeRequest request = CreateGradeRequest.builder()
                .studentId(studentId).status(GradeStatus.PENDING).build();

        mockMvc.perform(post(BASE_URL, schoolId, classId, assignmentId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(gradeService);
    }

    @Test
    @DisplayName("POST grades returns 403 when authenticated as different school")
    void createGrade_returns403WhenDifferentSchool() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID differentSchoolId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        CreateGradeRequest request = CreateGradeRequest.builder()
                .studentId(studentId).status(GradeStatus.PENDING).build();

        mockMvc.perform(post(BASE_URL, schoolId, classId, assignmentId)
                        .with(user(differentSchoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ACCESS_DENIED")));

        verifyNoInteractions(gradeService);
    }

    @Test
    @DisplayName("POST grades returns 404 when assignment not found")
    void createGrade_returns404WhenNotFound() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        when(gradeService.createGrade(any(), any(), any(), any()))
                .thenThrow(new ResourceNotFoundException("Assignment", assignmentId));

        mockMvc.perform(post(BASE_URL, schoolId, classId, assignmentId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("{\"studentId\":\"%s\",\"status\":\"PENDING\"}", studentId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("NOT_FOUND")));
    }

    @Test
    @DisplayName("POST grades returns 409 when duplicate (student, assignment) pair")
    void createGrade_returns409WhenDuplicate() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        when(gradeService.createGrade(any(), any(), any(), any()))
                .thenThrow(new DuplicateResourceException("Grade", "studentId+assignmentId",
                        studentId + "+" + assignmentId));

        mockMvc.perform(post(BASE_URL, schoolId, classId, assignmentId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format("{\"studentId\":\"%s\",\"status\":\"PENDING\"}", studentId)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)));
    }

    // ---- POST /grades/bulk ----

    @Test
    @DisplayName("POST grades/bulk returns 201 with all created grades")
    void bulkCreateGrades_returns201OnSuccess() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID studentId1 = UUID.randomUUID();
        UUID studentId2 = UUID.randomUUID();

        BulkCreateGradesRequest request = new BulkCreateGradesRequest(List.of(
                CreateGradeRequest.builder().studentId(studentId1).status(GradeStatus.GRADED)
                        .pointsEarned(BigDecimal.valueOf(80)).build(),
                CreateGradeRequest.builder().studentId(studentId2).status(GradeStatus.GRADED)
                        .pointsEarned(BigDecimal.valueOf(90)).build()
        ));

        List<GradeResponse> responses = List.of(
                GradeResponse.builder().id(UUID.randomUUID()).assignmentId(assignmentId)
                        .studentId(studentId1).status(GradeStatus.GRADED).pointsEarned(BigDecimal.valueOf(80)).build(),
                GradeResponse.builder().id(UUID.randomUUID()).assignmentId(assignmentId)
                        .studentId(studentId2).status(GradeStatus.GRADED).pointsEarned(BigDecimal.valueOf(90)).build()
        );

        when(gradeService.bulkCreateGrades(eq(schoolId), eq(classId), eq(assignmentId),
                any(BulkCreateGradesRequest.class))).thenReturn(responses);

        mockMvc.perform(post(BASE_URL + "/bulk", schoolId, classId, assignmentId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(2)));

        verify(gradeService).bulkCreateGrades(eq(schoolId), eq(classId), eq(assignmentId),
                any(BulkCreateGradesRequest.class));
    }

    @Test
    @DisplayName("POST grades/bulk returns 400 when grades list is empty")
    void bulkCreateGrades_returns400WhenEmptyList() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        mockMvc.perform(post(BASE_URL + "/bulk", schoolId, classId, assignmentId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"grades\":[]}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(gradeService);
    }

    @Test
    @DisplayName("POST grades/bulk returns 409 when duplicate found")
    void bulkCreateGrades_returns409WhenDuplicate() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        when(gradeService.bulkCreateGrades(any(), any(), any(), any()))
                .thenThrow(new DuplicateResourceException("Grade", "studentId+assignmentId",
                        studentId + "+" + assignmentId));

        String body = String.format(
                "{\"grades\":[{\"studentId\":\"%s\",\"status\":\"GRADED\"}]}",
                studentId);

        mockMvc.perform(post(BASE_URL + "/bulk", schoolId, classId, assignmentId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)));
    }

    // ---- GET /grades/{gradeId} ----

    @Test
    @DisplayName("GET grades/{gradeId} returns 200 with grade")
    void getGrade_returns200OnSuccess() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID gradeId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        GradeResponse response = GradeResponse.builder()
                .id(gradeId).assignmentId(assignmentId).studentId(studentId)
                .status(GradeStatus.GRADED).pointsEarned(BigDecimal.valueOf(75))
                .build();

        when(gradeService.getGrade(eq(schoolId), eq(classId), eq(assignmentId), eq(gradeId)))
                .thenReturn(response);

        mockMvc.perform(get(BASE_URL + "/{gradeId}", schoolId, classId, assignmentId, gradeId)
                        .with(user(schoolId.toString())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(gradeId.toString())))
                .andExpect(jsonPath("$.data.status", is("GRADED")));

        verify(gradeService).getGrade(schoolId, classId, assignmentId, gradeId);
    }

    @Test
    @DisplayName("GET grades/{gradeId} returns 401 when unauthenticated")
    void getGrade_returns401WhenUnauthenticated() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID gradeId = UUID.randomUUID();

        mockMvc.perform(get(BASE_URL + "/{gradeId}", schoolId, classId, assignmentId, gradeId))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(gradeService);
    }

    @Test
    @DisplayName("GET grades/{gradeId} returns 403 when authenticated as different school")
    void getGrade_returns403WhenDifferentSchool() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID gradeId = UUID.randomUUID();
        UUID differentSchoolId = UUID.randomUUID();

        mockMvc.perform(get(BASE_URL + "/{gradeId}", schoolId, classId, assignmentId, gradeId)
                        .with(user(differentSchoolId.toString())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ACCESS_DENIED")));

        verifyNoInteractions(gradeService);
    }

    @Test
    @DisplayName("GET grades/{gradeId} returns 404 when grade not found")
    void getGrade_returns404WhenNotFound() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID gradeId = UUID.randomUUID();

        when(gradeService.getGrade(any(), any(), any(), any()))
                .thenThrow(new ResourceNotFoundException("Grade", gradeId));

        mockMvc.perform(get(BASE_URL + "/{gradeId}", schoolId, classId, assignmentId, gradeId)
                        .with(user(schoolId.toString())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("NOT_FOUND")));
    }

    // ---- PUT /grades/{gradeId} ----

    @Test
    @DisplayName("PUT grades/{gradeId} returns 200 with updated grade")
    void updateGrade_returns200OnSuccess() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID gradeId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        UpdateGradeRequest request = UpdateGradeRequest.builder()
                .status(GradeStatus.GRADED)
                .pointsEarned(BigDecimal.valueOf(95))
                .notes("Great work")
                .build();

        GradeResponse response = GradeResponse.builder()
                .id(gradeId).assignmentId(assignmentId).studentId(studentId)
                .status(GradeStatus.GRADED).pointsEarned(BigDecimal.valueOf(95))
                .notes("Great work")
                .build();

        when(gradeService.updateGrade(eq(schoolId), eq(classId), eq(assignmentId), eq(gradeId),
                any(UpdateGradeRequest.class))).thenReturn(response);

        mockMvc.perform(put(BASE_URL + "/{gradeId}", schoolId, classId, assignmentId, gradeId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.status", is("GRADED")))
                .andExpect(jsonPath("$.data.notes", is("Great work")));

        verify(gradeService).updateGrade(eq(schoolId), eq(classId), eq(assignmentId), eq(gradeId),
                any(UpdateGradeRequest.class));
    }

    @Test
    @DisplayName("PUT grades/{gradeId} returns 404 when grade not found")
    void updateGrade_returns404WhenNotFound() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID gradeId = UUID.randomUUID();

        when(gradeService.updateGrade(any(), any(), any(), any(), any()))
                .thenThrow(new ResourceNotFoundException("Grade", gradeId));

        mockMvc.perform(put(BASE_URL + "/{gradeId}", schoolId, classId, assignmentId, gradeId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"GRADED\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("NOT_FOUND")));
    }

    @Test
    @DisplayName("PUT grades/{gradeId} returns 403 when authenticated as different school")
    void updateGrade_returns403WhenDifferentSchool() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID gradeId = UUID.randomUUID();
        UUID differentSchoolId = UUID.randomUUID();

        mockMvc.perform(put(BASE_URL + "/{gradeId}", schoolId, classId, assignmentId, gradeId)
                        .with(user(differentSchoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"GRADED\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ACCESS_DENIED")));

        verifyNoInteractions(gradeService);
    }

    // ---- DELETE /grades/{gradeId} ----

    @Test
    @DisplayName("DELETE grades/{gradeId} returns 204 on success")
    void deleteGrade_returns204OnSuccess() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID gradeId = UUID.randomUUID();

        doNothing().when(gradeService).deleteGrade(eq(schoolId), eq(classId), eq(assignmentId), eq(gradeId));

        mockMvc.perform(delete(BASE_URL + "/{gradeId}", schoolId, classId, assignmentId, gradeId)
                        .with(user(schoolId.toString())))
                .andExpect(status().isNoContent());

        verify(gradeService).deleteGrade(schoolId, classId, assignmentId, gradeId);
    }

    @Test
    @DisplayName("DELETE grades/{gradeId} returns 404 when grade not found")
    void deleteGrade_returns404WhenNotFound() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID gradeId = UUID.randomUUID();

        doThrow(new ResourceNotFoundException("Grade", gradeId))
                .when(gradeService).deleteGrade(any(), any(), any(), any());

        mockMvc.perform(delete(BASE_URL + "/{gradeId}", schoolId, classId, assignmentId, gradeId)
                        .with(user(schoolId.toString())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("NOT_FOUND")));
    }

    @Test
    @DisplayName("DELETE grades/{gradeId} returns 401 when unauthenticated")
    void deleteGrade_returns401WhenUnauthenticated() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID gradeId = UUID.randomUUID();

        mockMvc.perform(delete(BASE_URL + "/{gradeId}", schoolId, classId, assignmentId, gradeId))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(gradeService);
    }

    @Test
    @DisplayName("DELETE grades/{gradeId} returns 403 when authenticated as different school")
    void deleteGrade_returns403WhenDifferentSchool() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID gradeId = UUID.randomUUID();
        UUID differentSchoolId = UUID.randomUUID();

        mockMvc.perform(delete(BASE_URL + "/{gradeId}", schoolId, classId, assignmentId, gradeId)
                        .with(user(differentSchoolId.toString())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ACCESS_DENIED")));

        verifyNoInteractions(gradeService);
    }
}
