package com.tracegrade.assignment;

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
import java.time.LocalDate;
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
import com.tracegrade.dto.request.CreateAssignmentRequest;
import com.tracegrade.dto.request.UpdateAssignmentRequest;
import com.tracegrade.dto.response.AssignmentResponse;
import com.tracegrade.exception.ResourceNotFoundException;
import com.tracegrade.filter.SanitizationProperties;
import com.tracegrade.ratelimit.RateLimitProperties;
import com.tracegrade.ratelimit.RateLimitService;

@WebMvcTest(AssignmentController.class)
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
class AssignmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AssignmentService assignmentService;

    @MockBean
    private RateLimitService rateLimitService;

    // ---- GET / (list) ----

    @Test
    @DisplayName("GET assignments returns 200 with list of assignments")
    void listAssignments_returnsOk() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        List<AssignmentResponse> assignments = List.of(
                AssignmentResponse.builder()
                        .id(UUID.randomUUID()).classId(classId).categoryId(categoryId)
                        .name("Quiz 1").maxPoints(BigDecimal.valueOf(50)).isPublished(true).build(),
                AssignmentResponse.builder()
                        .id(UUID.randomUUID()).classId(classId).categoryId(categoryId)
                        .name("Homework 1").maxPoints(BigDecimal.valueOf(20)).isPublished(true).build()
        );

        when(assignmentService.listAssignments(eq(schoolId), eq(classId))).thenReturn(assignments);

        mockMvc.perform(get("/api/schools/{schoolId}/classes/{classId}/assignments", schoolId, classId)
                        .with(user(schoolId.toString())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].name", is("Quiz 1")))
                .andExpect(jsonPath("$.data[1].name", is("Homework 1")));

        verify(assignmentService).listAssignments(schoolId, classId);
    }

    @Test
    @DisplayName("GET assignments returns 401 when unauthenticated")
    void listAssignments_returnsUnauthorizedWhenUnauthenticated() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        mockMvc.perform(get("/api/schools/{schoolId}/classes/{classId}/assignments", schoolId, classId))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(assignmentService);
    }

    @Test
    @DisplayName("GET assignments returns 403 when authenticated as different school")
    void listAssignments_returns403WhenDifferentSchool() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID differentSchoolId = UUID.randomUUID();

        mockMvc.perform(get("/api/schools/{schoolId}/classes/{classId}/assignments", schoolId, classId)
                        .with(user(differentSchoolId.toString())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ACCESS_DENIED")));

        verifyNoInteractions(assignmentService);
    }

    @Test
    @DisplayName("GET assignments returns 404 when class not found")
    void listAssignments_returns404WhenClassNotFound() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        when(assignmentService.listAssignments(any(), any()))
                .thenThrow(new ResourceNotFoundException("Class", classId));

        mockMvc.perform(get("/api/schools/{schoolId}/classes/{classId}/assignments", schoolId, classId)
                        .with(user(schoolId.toString())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("NOT_FOUND")));
    }

    // ---- GET /{assignmentId} (single) ----

    @Test
    @DisplayName("GET assignment by ID returns 200 with assignment")
    void getAssignment_returnsOk() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        AssignmentResponse response = AssignmentResponse.builder()
                .id(assignmentId).classId(classId).categoryId(categoryId)
                .name("Final Exam").maxPoints(BigDecimal.valueOf(100)).isPublished(true)
                .dueDate(LocalDate.of(2026, 6, 20))
                .build();

        when(assignmentService.getAssignment(eq(schoolId), eq(classId), eq(assignmentId))).thenReturn(response);

        mockMvc.perform(get("/api/schools/{schoolId}/classes/{classId}/assignments/{assignmentId}",
                        schoolId, classId, assignmentId)
                        .with(user(schoolId.toString())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.name", is("Final Exam")))
                .andExpect(jsonPath("$.data.classId", is(classId.toString())));

        verify(assignmentService).getAssignment(schoolId, classId, assignmentId);
    }

    @Test
    @DisplayName("GET assignment by ID returns 404 when not found")
    void getAssignment_notFound_returns404() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        when(assignmentService.getAssignment(any(), any(), any()))
                .thenThrow(new ResourceNotFoundException("Assignment", assignmentId));

        mockMvc.perform(get("/api/schools/{schoolId}/classes/{classId}/assignments/{assignmentId}",
                        schoolId, classId, assignmentId)
                        .with(user(schoolId.toString())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("NOT_FOUND")));
    }

    // ---- POST / (create) ----

    @Test
    @DisplayName("POST assignment returns 201 with created assignment")
    void createAssignment_returnsCreated() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        CreateAssignmentRequest request = CreateAssignmentRequest.builder()
                .categoryId(categoryId)
                .name("Chapter 1 Quiz")
                .maxPoints(BigDecimal.valueOf(50))
                .isPublished(true)
                .build();

        AssignmentResponse response = AssignmentResponse.builder()
                .id(assignmentId).classId(classId).categoryId(categoryId)
                .name("Chapter 1 Quiz").maxPoints(BigDecimal.valueOf(50)).isPublished(true)
                .build();

        when(assignmentService.createAssignment(eq(schoolId), eq(classId), any(CreateAssignmentRequest.class)))
                .thenReturn(response);

        mockMvc.perform(post("/api/schools/{schoolId}/classes/{classId}/assignments", schoolId, classId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.name", is("Chapter 1 Quiz")))
                .andExpect(jsonPath("$.data.classId", is(classId.toString())));

        verify(assignmentService).createAssignment(eq(schoolId), eq(classId), any(CreateAssignmentRequest.class));
    }

    @Test
    @DisplayName("POST assignment returns 401 when unauthenticated")
    void createAssignment_returnsUnauthorizedWhenUnauthenticated() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        CreateAssignmentRequest request = CreateAssignmentRequest.builder()
                .categoryId(categoryId).name("Quiz").maxPoints(BigDecimal.valueOf(50)).build();

        mockMvc.perform(post("/api/schools/{schoolId}/classes/{classId}/assignments", schoolId, classId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(assignmentService);
    }

    @Test
    @DisplayName("POST assignment returns 400 when category does not belong to class")
    void createAssignment_returns400WhenCategoryNotInClass() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        when(assignmentService.createAssignment(any(), any(), any()))
                .thenThrow(new IllegalArgumentException("Category does not belong to this class"));

        mockMvc.perform(post("/api/schools/{schoolId}/classes/{classId}/assignments", schoolId, classId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"categoryId\":\"" + UUID.randomUUID() + "\",\"name\":\"Quiz\",\"maxPoints\":50}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("VALIDATION_ERROR")));
    }

    @Test
    @DisplayName("POST assignment returns 400 when required fields are missing")
    void createAssignment_returns400WhenValidationFails() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        // Missing required fields: categoryId, name, maxPoints
        mockMvc.perform(post("/api/schools/{schoolId}/classes/{classId}/assignments", schoolId, classId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(assignmentService);
    }

    @Test
    @DisplayName("POST assignment returns 403 when authenticated as different school")
    void createAssignment_returns403WhenDifferentSchool() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID differentSchoolId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        CreateAssignmentRequest request = CreateAssignmentRequest.builder()
                .categoryId(categoryId).name("Quiz").maxPoints(BigDecimal.valueOf(50)).build();

        mockMvc.perform(post("/api/schools/{schoolId}/classes/{classId}/assignments", schoolId, classId)
                        .with(user(differentSchoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ACCESS_DENIED")));

        verifyNoInteractions(assignmentService);
    }

    // ---- PUT /{assignmentId} (update) ----

    @Test
    @DisplayName("PUT assignment returns 200 with updated assignment")
    void updateAssignment_returnsOk() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        UpdateAssignmentRequest request = UpdateAssignmentRequest.builder()
                .name("Updated Quiz")
                .maxPoints(BigDecimal.valueOf(75))
                .build();

        AssignmentResponse response = AssignmentResponse.builder()
                .id(assignmentId).classId(classId).categoryId(categoryId)
                .name("Updated Quiz").maxPoints(BigDecimal.valueOf(75)).isPublished(true)
                .build();

        when(assignmentService.updateAssignment(eq(schoolId), eq(classId), eq(assignmentId),
                any(UpdateAssignmentRequest.class))).thenReturn(response);

        mockMvc.perform(put("/api/schools/{schoolId}/classes/{classId}/assignments/{assignmentId}",
                        schoolId, classId, assignmentId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.name", is("Updated Quiz")));

        verify(assignmentService).updateAssignment(eq(schoolId), eq(classId), eq(assignmentId),
                any(UpdateAssignmentRequest.class));
    }

    @Test
    @DisplayName("PUT assignment returns 404 when assignment not found")
    void updateAssignment_returns404WhenNotFound() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        when(assignmentService.updateAssignment(any(), any(), any(), any()))
                .thenThrow(new ResourceNotFoundException("Assignment", assignmentId));

        mockMvc.perform(put("/api/schools/{schoolId}/classes/{classId}/assignments/{assignmentId}",
                        schoolId, classId, assignmentId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Updated\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("NOT_FOUND")));
    }

    @Test
    @DisplayName("PUT assignment returns 403 when authenticated as different school")
    void updateAssignment_returns403WhenDifferentSchool() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID differentSchoolId = UUID.randomUUID();

        mockMvc.perform(put("/api/schools/{schoolId}/classes/{classId}/assignments/{assignmentId}",
                        schoolId, classId, assignmentId)
                        .with(user(differentSchoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Updated\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ACCESS_DENIED")));

        verifyNoInteractions(assignmentService);
    }

    // ---- DELETE /{assignmentId} ----

    @Test
    @DisplayName("DELETE assignment returns 204 on success")
    void deleteAssignment_returnsNoContent() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        doNothing().when(assignmentService).deleteAssignment(eq(schoolId), eq(classId), eq(assignmentId));

        mockMvc.perform(delete("/api/schools/{schoolId}/classes/{classId}/assignments/{assignmentId}",
                        schoolId, classId, assignmentId)
                        .with(user(schoolId.toString())))
                .andExpect(status().isNoContent());

        verify(assignmentService).deleteAssignment(schoolId, classId, assignmentId);
    }

    @Test
    @DisplayName("DELETE assignment returns 404 when assignment not found")
    void deleteAssignment_returns404WhenNotFound() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        doThrow(new ResourceNotFoundException("Assignment", assignmentId))
                .when(assignmentService).deleteAssignment(any(), any(), any());

        mockMvc.perform(delete("/api/schools/{schoolId}/classes/{classId}/assignments/{assignmentId}",
                        schoolId, classId, assignmentId)
                        .with(user(schoolId.toString())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("NOT_FOUND")));
    }

    @Test
    @DisplayName("DELETE assignment returns 401 when unauthenticated")
    void deleteAssignment_returnsUnauthorizedWhenUnauthenticated() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        mockMvc.perform(delete("/api/schools/{schoolId}/classes/{classId}/assignments/{assignmentId}",
                        schoolId, classId, assignmentId))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(assignmentService);
    }

    @Test
    @DisplayName("DELETE assignment returns 403 when authenticated as different school")
    void deleteAssignment_returns403WhenDifferentSchool() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID differentSchoolId = UUID.randomUUID();

        mockMvc.perform(delete("/api/schools/{schoolId}/classes/{classId}/assignments/{assignmentId}",
                        schoolId, classId, assignmentId)
                        .with(user(differentSchoolId.toString())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ACCESS_DENIED")));

        verifyNoInteractions(assignmentService);
    }
}
