package com.tracegrade.submission;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import com.tracegrade.domain.model.GradingResult;
import com.tracegrade.domain.model.StudentSubmission;
import com.tracegrade.domain.model.SubmissionStatus;
import com.tracegrade.domain.repository.StudentSubmissionRepository;
import com.tracegrade.dto.response.SubmissionStatusResponse;
import com.tracegrade.exception.ResourceNotFoundException;

@SuppressWarnings("null") // Mockito thenReturn vs @NonNull JpaRepository contracts
class StudentSubmissionServiceTest {

    private StudentSubmissionRepository submissionRepository;
    private StudentSubmissionService service;

    private static final UUID SUBMISSION_ID  = UUID.randomUUID();
    private static final UUID ASSIGNMENT_ID  = UUID.randomUUID();
    private static final UUID STUDENT_ID     = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        submissionRepository = mock(StudentSubmissionRepository.class);
        service = new StudentSubmissionService(submissionRepository);
    }

    // ──────────────────────────────────────────────────────────
    // getSubmission
    // ──────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getSubmission")
    class GetSubmissionTests {

        @Test
        @DisplayName("Should return status response when submission exists and has no grading result")
        void pendingSubmission() {
            StudentSubmission submission = buildSubmission(SubmissionStatus.PENDING, null);
            when(submissionRepository.findById(SUBMISSION_ID)).thenReturn(Optional.of(submission));

            SubmissionStatusResponse response = service.getSubmission(SUBMISSION_ID);

            assertThat(response.getSubmissionId()).isEqualTo(submission.getId());
            assertThat(response.getAssignmentId()).isEqualTo(ASSIGNMENT_ID);
            assertThat(response.getStudentId()).isEqualTo(STUDENT_ID);
            assertThat(response.getStatus()).isEqualTo(SubmissionStatus.PENDING.name());
            assertThat(response.getSubmittedAt()).isNotNull();
            assertThat(response.getGradingResult()).isNull();
        }

        @Test
        @DisplayName("Should include grading result summary when submission is COMPLETED")
        void completedSubmissionWithGradingResult() {
            GradingResult gr = buildGradingResult();
            StudentSubmission submission = buildSubmission(SubmissionStatus.COMPLETED, gr);
            when(submissionRepository.findById(SUBMISSION_ID)).thenReturn(Optional.of(submission));

            SubmissionStatusResponse response = service.getSubmission(SUBMISSION_ID);

            assertThat(response.getStatus()).isEqualTo(SubmissionStatus.COMPLETED.name());
            assertThat(response.getGradingResult()).isNotNull();
            assertThat(response.getGradingResult().getAiScore()).isEqualByComparingTo("87.50");
            assertThat(response.getGradingResult().getConfidenceScore()).isEqualByComparingTo("92.00");
            assertThat(response.getGradingResult().getNeedsReview()).isFalse();
            assertThat(response.getGradingResult().getTeacherOverride()).isFalse();
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when submission does not exist")
        void notFound() {
            when(submissionRepository.findById(SUBMISSION_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.getSubmission(SUBMISSION_ID))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining(SUBMISSION_ID.toString());
        }
    }

    // ──────────────────────────────────────────────────────────
    // updateStatus
    // ──────────────────────────────────────────────────────────

    @Nested
    @DisplayName("updateStatus")
    class UpdateStatusTests {

        @Test
        @DisplayName("Should update status and return updated response")
        void updateToPROCESSING() {
            StudentSubmission submission = buildSubmission(SubmissionStatus.PENDING, null);
            when(submissionRepository.findById(SUBMISSION_ID)).thenReturn(Optional.of(submission));

            StudentSubmission updated = buildSubmission(SubmissionStatus.PROCESSING, null);
            when(submissionRepository.save(any(StudentSubmission.class))).thenReturn(updated);

            SubmissionStatusResponse response = service.updateStatus(SUBMISSION_ID, SubmissionStatus.PROCESSING);

            assertThat(response.getStatus()).isEqualTo(SubmissionStatus.PROCESSING.name());
            verify(submissionRepository).save(submission);
        }

        @Test
        @DisplayName("Should update to COMPLETED and reflect grading result in response")
        void updateToCOMPLETED() {
            StudentSubmission submission = buildSubmission(SubmissionStatus.PROCESSING, null);
            when(submissionRepository.findById(SUBMISSION_ID)).thenReturn(Optional.of(submission));

            GradingResult gr = buildGradingResult();
            StudentSubmission completed = buildSubmission(SubmissionStatus.COMPLETED, gr);
            when(submissionRepository.save(any(StudentSubmission.class))).thenReturn(completed);

            SubmissionStatusResponse response = service.updateStatus(SUBMISSION_ID, SubmissionStatus.COMPLETED);

            assertThat(response.getStatus()).isEqualTo(SubmissionStatus.COMPLETED.name());
            assertThat(response.getGradingResult()).isNotNull();
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when submission does not exist")
        void notFound() {
            when(submissionRepository.findById(SUBMISSION_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.updateStatus(SUBMISSION_ID, SubmissionStatus.PROCESSING))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining(SUBMISSION_ID.toString());
        }
    }

    // ──────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────

    private StudentSubmission buildSubmission(SubmissionStatus status, GradingResult gradingResult) {
        StudentSubmission submission = StudentSubmission.builder()
                .assignmentId(ASSIGNMENT_ID)
                .studentId(STUDENT_ID)
                .submissionImageUrls("[\"https://bucket/exam.jpg\"]")
                .originalFormat("jpg")
                .status(status)
                .submittedAt(Instant.now())
                .build();
        // set id via reflection workaround — use UUID field from BaseEntity setter
        submission.setGradingResult(gradingResult);
        return submission;
    }

    private GradingResult buildGradingResult() {
        return GradingResult.builder()
                .gradeId(UUID.randomUUID())
                .aiScore(new BigDecimal("87.50"))
                .finalScore(new BigDecimal("87.50"))
                .confidenceScore(new BigDecimal("92.00"))
                .needsReview(false)
                .questionScores("[]")
                .teacherOverride(false)
                .build();
    }
}
