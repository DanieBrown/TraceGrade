package com.tracegrade.submission;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.tracegrade.config.CsrfAccessDeniedHandler;
import com.tracegrade.config.CorsProperties;
import com.tracegrade.config.CsrfProperties;
import com.tracegrade.config.SecurityConfig;
import com.tracegrade.config.SecurityHeadersProperties;
import com.tracegrade.domain.model.SubmissionStatus;
import com.tracegrade.dto.response.BatchUploadResponse;
import com.tracegrade.dto.response.FileUploadResponse;
import com.tracegrade.dto.response.SubmissionStatusResponse;
import com.tracegrade.exception.ResourceNotFoundException;
import com.tracegrade.filter.SanitizationProperties;
import com.tracegrade.ratelimit.RateLimitProperties;
import com.tracegrade.ratelimit.RateLimitService;

@WebMvcTest(StudentSubmissionController.class)
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
@WithMockUser
@SuppressWarnings("null") // Hamcrest is() / csrf() vs @NonNull MockMvc API contracts
class StudentSubmissionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SubmissionUploadService uploadService;

    @MockBean
    private StudentSubmissionService submissionService;

    @MockBean
    private RateLimitService rateLimitService;

    // JPEG magic bytes prefix — ensures @ValidFileUpload passes in tests
    private static final byte[] JPEG_BYTES = {
        (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    };

    private static final UUID ASSIGNMENT_ID = UUID.randomUUID();
    private static final UUID STUDENT_ID    = UUID.randomUUID();

    @Nested
    @DisplayName("POST /api/submissions/upload")
    class SingleUploadTests {

        @Test
        @DisplayName("Should return 200 with FileUploadResponse on valid upload")
        void validUpload() throws Exception {
            UUID submissionId = UUID.randomUUID();
            FileUploadResponse stubResponse = FileUploadResponse.builder()
                    .submissionId(submissionId)
                    .fileUrl("https://bucket/submissions/exam.jpg")
                    .fileName("exam.jpg")
                    .status("PENDING")
                    .uploadedAt(Instant.now())
                    .build();

            when(uploadService.uploadSingle(eq(ASSIGNMENT_ID), eq(STUDENT_ID), any()))
                    .thenReturn(stubResponse);

            MockMultipartFile file = new MockMultipartFile("file", "exam.jpg", "image/jpeg", JPEG_BYTES);

            mockMvc.perform(multipart("/api/submissions/upload")
                            .file(file)
                            .param("assignmentId", ASSIGNMENT_ID.toString())
                            .param("studentId", STUDENT_ID.toString())
                            .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success", is(true)))
                    .andExpect(jsonPath("$.data.submissionId", is(submissionId.toString())))
                    .andExpect(jsonPath("$.data.fileUrl", is("https://bucket/submissions/exam.jpg")))
                    .andExpect(jsonPath("$.data.status", is("PENDING")));

            verify(uploadService).uploadSingle(eq(ASSIGNMENT_ID), eq(STUDENT_ID), any());
        }

        @Test
        @DisplayName("Should return 400 when file type is invalid")
        void invalidFileType() throws Exception {
            // Bytes that do not match any allowed magic number
            byte[] exeBytes = new byte[]{'M', 'Z', 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
            MockMultipartFile file = new MockMultipartFile("file", "malware.exe", "application/octet-stream", exeBytes);

            mockMvc.perform(multipart("/api/submissions/upload")
                            .file(file)
                            .param("assignmentId", ASSIGNMENT_ID.toString())
                            .param("studentId", STUDENT_ID.toString())
                            .with(csrf()))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when assignmentId is missing")
        void missingAssignmentId() throws Exception {
            MockMultipartFile file = new MockMultipartFile("file", "exam.jpg", "image/jpeg", JPEG_BYTES);

            mockMvc.perform(multipart("/api/submissions/upload")
                            .file(file)
                            .param("studentId", STUDENT_ID.toString())
                            .with(csrf()))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when studentId is missing")
        void missingStudentId() throws Exception {
            MockMultipartFile file = new MockMultipartFile("file", "exam.jpg", "image/jpeg", JPEG_BYTES);

            mockMvc.perform(multipart("/api/submissions/upload")
                            .file(file)
                            .param("assignmentId", ASSIGNMENT_ID.toString())
                            .with(csrf()))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("POST /api/submissions/upload/batch")
    class BatchUploadTests {

        @Test
        @DisplayName("Should return 200 with BatchUploadResponse on valid batch upload")
        void validBatchUpload() throws Exception {
            UUID id1 = UUID.randomUUID();
            UUID id2 = UUID.randomUUID();

            BatchUploadResponse stubResponse = BatchUploadResponse.builder()
                    .submissions(List.of(
                            FileUploadResponse.builder().submissionId(id1).fileUrl("https://bucket/page1.jpg")
                                    .fileName("page1.jpg").status("PENDING").uploadedAt(Instant.now()).build(),
                            FileUploadResponse.builder().submissionId(id2).fileUrl("https://bucket/page2.jpg")
                                    .fileName("page2.jpg").status("PENDING").uploadedAt(Instant.now()).build()
                    ))
                    .totalFiles(2)
                    .successfulUploads(2)
                    .build();

            when(uploadService.uploadBatch(eq(ASSIGNMENT_ID), eq(STUDENT_ID), any()))
                    .thenReturn(stubResponse);

            MockMultipartFile file1 = new MockMultipartFile("files", "page1.jpg", "image/jpeg", JPEG_BYTES);
            MockMultipartFile file2 = new MockMultipartFile("files", "page2.jpg", "image/jpeg", JPEG_BYTES);

            mockMvc.perform(multipart("/api/submissions/upload/batch")
                            .file(file1)
                            .file(file2)
                            .param("assignmentId", ASSIGNMENT_ID.toString())
                            .param("studentId", STUDENT_ID.toString())
                            .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success", is(true)))
                    .andExpect(jsonPath("$.data.totalFiles", is(2)))
                    .andExpect(jsonPath("$.data.successfulUploads", is(2)))
                    .andExpect(jsonPath("$.data.submissions.length()", is(2)));

            verify(uploadService).uploadBatch(eq(ASSIGNMENT_ID), eq(STUDENT_ID), any());
        }

        @Test
        @DisplayName("Should return 400 when files list is empty")
        void emptyFilesList() throws Exception {
            mockMvc.perform(multipart("/api/submissions/upload/batch")
                            .param("assignmentId", ASSIGNMENT_ID.toString())
                            .param("studentId", STUDENT_ID.toString())
                            .with(csrf()))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("GET /api/submissions/{submissionId}")
    class GetSubmissionTests {

        @Test
        @DisplayName("Should return 200 with submission status when found")
        void submissionFound() throws Exception {
            UUID submissionId = UUID.randomUUID();
            SubmissionStatusResponse stubResponse = SubmissionStatusResponse.builder()
                    .submissionId(submissionId)
                    .assignmentId(ASSIGNMENT_ID)
                    .studentId(STUDENT_ID)
                    .status(SubmissionStatus.PENDING.name())
                    .submittedAt(Instant.now())
                    .updatedAt(Instant.now())
                    .gradingResult(null)
                    .build();

            when(submissionService.getSubmission(submissionId)).thenReturn(stubResponse);

            mockMvc.perform(get("/api/submissions/{id}", submissionId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success", is(true)))
                    .andExpect(jsonPath("$.data.submissionId", is(submissionId.toString())))
                    .andExpect(jsonPath("$.data.status", is("PENDING")))
                    .andExpect(jsonPath("$.data.gradingResult").doesNotExist());

            verify(submissionService).getSubmission(submissionId);
        }

        @Test
        @DisplayName("Should return 200 with grading result when submission is COMPLETED")
        void completedSubmissionWithGradingResult() throws Exception {
            UUID submissionId = UUID.randomUUID();
            SubmissionStatusResponse.GradingResultSummary summary = SubmissionStatusResponse.GradingResultSummary.builder()
                    .gradeId(UUID.randomUUID())
                    .aiScore(new BigDecimal("87.50"))
                    .finalScore(new BigDecimal("87.50"))
                    .confidenceScore(new BigDecimal("92.00"))
                    .needsReview(false)
                    .teacherOverride(false)
                    .build();

            SubmissionStatusResponse stubResponse = SubmissionStatusResponse.builder()
                    .submissionId(submissionId)
                    .assignmentId(ASSIGNMENT_ID)
                    .studentId(STUDENT_ID)
                    .status(SubmissionStatus.COMPLETED.name())
                    .submittedAt(Instant.now())
                    .updatedAt(Instant.now())
                    .gradingResult(summary)
                    .build();

            when(submissionService.getSubmission(submissionId)).thenReturn(stubResponse);

            mockMvc.perform(get("/api/submissions/{id}", submissionId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status", is("COMPLETED")))
                    .andExpect(jsonPath("$.data.gradingResult.confidenceScore", is(92.00)));
        }

        @Test
        @DisplayName("Should return 404 when submission does not exist")
        void submissionNotFound() throws Exception {
            UUID submissionId = UUID.randomUUID();
            when(submissionService.getSubmission(submissionId))
                    .thenThrow(new ResourceNotFoundException("StudentSubmission", submissionId));

            mockMvc.perform(get("/api/submissions/{id}", submissionId))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.success", is(false)));
        }
    }

    @Nested
    @DisplayName("PATCH /api/submissions/{submissionId}/status")
    class UpdateStatusTests {

        @Test
        @DisplayName("Should return 200 with updated status on valid request")
        void validStatusUpdate() throws Exception {
            UUID submissionId = UUID.randomUUID();
            SubmissionStatusResponse stubResponse = SubmissionStatusResponse.builder()
                    .submissionId(submissionId)
                    .assignmentId(ASSIGNMENT_ID)
                    .studentId(STUDENT_ID)
                    .status(SubmissionStatus.PROCESSING.name())
                    .submittedAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();

            when(submissionService.updateStatus(eq(submissionId), eq(SubmissionStatus.PROCESSING)))
                    .thenReturn(stubResponse);

            mockMvc.perform(patch("/api/submissions/{id}/status", submissionId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"status\":\"PROCESSING\"}")
                            .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success", is(true)))
                    .andExpect(jsonPath("$.data.status", is("PROCESSING")));

            verify(submissionService).updateStatus(submissionId, SubmissionStatus.PROCESSING);
        }

        @Test
        @DisplayName("Should return 400 when status value is invalid")
        void invalidStatusValue() throws Exception {
            UUID submissionId = UUID.randomUUID();

            mockMvc.perform(patch("/api/submissions/{id}/status", submissionId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"status\":\"INVALID_STATUS\"}")
                            .with(csrf()))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when status field is missing")
        void missingStatusField() throws Exception {
            UUID submissionId = UUID.randomUUID();

            mockMvc.perform(patch("/api/submissions/{id}/status", submissionId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}")
                            .with(csrf()))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 404 when submission does not exist")
        void submissionNotFound() throws Exception {
            UUID submissionId = UUID.randomUUID();
            when(submissionService.updateStatus(eq(submissionId), any(SubmissionStatus.class)))
                    .thenThrow(new ResourceNotFoundException("StudentSubmission", submissionId));

            mockMvc.perform(patch("/api/submissions/{id}/status", submissionId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"status\":\"PROCESSING\"}")
                            .with(csrf()))
                    .andExpect(status().isNotFound());
        }
    }
}
