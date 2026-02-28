package com.tracegrade.enrollment;

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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
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
import com.tracegrade.dto.request.EnrollStudentRequest;
import com.tracegrade.dto.response.EnrollmentResponse;
import com.tracegrade.exception.DuplicateResourceException;
import com.tracegrade.exception.ResourceNotFoundException;
import org.springframework.dao.DataIntegrityViolationException;
import com.tracegrade.filter.SanitizationProperties;
import com.tracegrade.ratelimit.RateLimitProperties;
import com.tracegrade.ratelimit.RateLimitService;

@WebMvcTest(ClassEnrollmentController.class)
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
class ClassEnrollmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ClassEnrollmentService enrollmentService;

    @MockBean
    private RateLimitService rateLimitService;

    @Test
    @DisplayName("POST enrollments returns 401 when unauthenticated")
    void enrollStudent_returnsUnauthorizedWhenUnauthenticated() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        EnrollStudentRequest request = new EnrollStudentRequest(UUID.randomUUID());

        mockMvc.perform(post("/api/schools/{schoolId}/classes/{classId}/enrollments", schoolId, classId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(enrollmentService);
    }

    @Test
    @DisplayName("POST enrollments returns 201 with EnrollmentResponse when authenticated")
    void enrollStudent_returns201WhenAuthenticated() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();

        EnrollStudentRequest request = new EnrollStudentRequest(studentId);
        EnrollmentResponse response = EnrollmentResponse.builder()
                .id(enrollmentId)
                .classId(classId)
                .studentId(studentId)
                .enrolledAt(Instant.now())
                .build();

        when(enrollmentService.enrollStudent(eq(schoolId), eq(classId), eq(studentId))).thenReturn(response);

        mockMvc.perform(post("/api/schools/{schoolId}/classes/{classId}/enrollments", schoolId, classId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.classId", is(classId.toString())))
                .andExpect(jsonPath("$.data.studentId", is(studentId.toString())));

        verify(enrollmentService).enrollStudent(schoolId, classId, studentId);
    }

    @Test
    @DisplayName("GET enrollments returns 200 with list of active enrollments")
    void listEnrollments_returns200WithList() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID studentId1 = UUID.randomUUID();
        UUID studentId2 = UUID.randomUUID();

        List<EnrollmentResponse> enrollments = List.of(
                EnrollmentResponse.builder()
                        .id(UUID.randomUUID()).classId(classId).studentId(studentId1).enrolledAt(Instant.now()).build(),
                EnrollmentResponse.builder()
                        .id(UUID.randomUUID()).classId(classId).studentId(studentId2).enrolledAt(Instant.now()).build()
        );

        when(enrollmentService.listEnrollments(eq(schoolId), eq(classId))).thenReturn(enrollments);

        mockMvc.perform(get("/api/schools/{schoolId}/classes/{classId}/enrollments", schoolId, classId)
                        .with(user(schoolId.toString())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].studentId", is(studentId1.toString())))
                .andExpect(jsonPath("$.data[1].studentId", is(studentId2.toString())));

        verify(enrollmentService).listEnrollments(schoolId, classId);
    }

    @Test
    @DisplayName("GET enrollments returns 401 when unauthenticated")
    void listEnrollments_returnsUnauthorizedWhenUnauthenticated() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        mockMvc.perform(get("/api/schools/{schoolId}/classes/{classId}/enrollments", schoolId, classId))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(enrollmentService);
    }

    @Test
    @DisplayName("DELETE enrollment returns 204 on successful drop")
    void dropStudent_returns204OnSuccess() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();

        doNothing().when(enrollmentService).dropStudent(eq(schoolId), eq(classId), eq(enrollmentId));

        mockMvc.perform(delete("/api/schools/{schoolId}/classes/{classId}/enrollments/{enrollmentId}",
                        schoolId, classId, enrollmentId)
                        .with(user(schoolId.toString())))
                .andExpect(status().isNoContent());

        verify(enrollmentService).dropStudent(schoolId, classId, enrollmentId);
    }

    @Test
    @DisplayName("DELETE enrollment returns 404 when enrollment not found")
    void dropStudent_returns404WhenNotFound() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();

        doThrow(new ResourceNotFoundException("Enrollment", enrollmentId))
                .when(enrollmentService).dropStudent(any(), any(), any());

        mockMvc.perform(delete("/api/schools/{schoolId}/classes/{classId}/enrollments/{enrollmentId}",
                        schoolId, classId, enrollmentId)
                        .with(user(schoolId.toString())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("NOT_FOUND")));
    }

    @Test
    @DisplayName("POST enroll returns 409 when student already enrolled")
    void enrollStudent_returns409WhenDuplicate() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        when(enrollmentService.enrollStudent(any(), any(), any()))
                .thenThrow(new DuplicateResourceException("Enrollment", "student", "already enrolled"));

        mockMvc.perform(post("/api/schools/{schoolId}/classes/{classId}/enrollments", schoolId, classId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)));

        verify(enrollmentService).enrollStudent(any(), any(), any());
    }

    @Test
    @DisplayName("POST enroll returns 409 with DUPLICATE_RESOURCE when DataIntegrityViolationException contains constraint name")
    void enrollStudent_returns409WhenDataIntegrityViolation() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        when(enrollmentService.enrollStudent(any(), any(), any()))
                .thenThrow(new DataIntegrityViolationException(
                        "could not execute statement; SQL [n/a]; constraint [uq_active_class_enrollment]"));

        mockMvc.perform(post("/api/schools/{schoolId}/classes/{classId}/enrollments", schoolId, classId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentId\":\"" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("DUPLICATE_RESOURCE")));
    }

    @Test
    @DisplayName("DELETE drop enrollment returns 401 when unauthenticated")
    void dropEnrollment_returns401WhenUnauthenticated() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();

        mockMvc.perform(delete("/api/schools/{schoolId}/classes/{classId}/enrollments/{enrollmentId}",
                        schoolId, classId, enrollmentId))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(enrollmentService);
    }

    @Test
    @DisplayName("GET enrollments returns 403 when authenticated as different school")
    void listEnrollments_returns403WhenDifferentSchool() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID differentSchoolId = UUID.randomUUID();

        mockMvc.perform(get("/api/schools/{schoolId}/classes/{classId}/enrollments", schoolId, classId)
                        .with(user(differentSchoolId.toString())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ACCESS_DENIED")));

        verifyNoInteractions(enrollmentService);
    }

    @Test
    @DisplayName("DELETE enrollment returns 403 when authenticated as different school")
    void dropStudent_returns403WhenDifferentSchool() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        UUID differentSchoolId = UUID.randomUUID();

        mockMvc.perform(delete("/api/schools/{schoolId}/classes/{classId}/enrollments/{enrollmentId}",
                        schoolId, classId, enrollmentId)
                        .with(user(differentSchoolId.toString())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ACCESS_DENIED")));

        verifyNoInteractions(enrollmentService);
    }

    @Test
    @DisplayName("POST enrollments returns 403 when authenticated as different school")
    void enrollStudent_returns403WhenDifferentSchool() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID differentSchoolId = UUID.randomUUID();
        EnrollStudentRequest request = new EnrollStudentRequest(UUID.randomUUID());

        mockMvc.perform(post("/api/schools/{schoolId}/classes/{classId}/enrollments", schoolId, classId)
                        .with(user(differentSchoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ACCESS_DENIED")));

        verifyNoInteractions(enrollmentService);
    }
}
