package com.tracegrade.grading;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tracegrade.domain.model.AnswerRubric;
import com.tracegrade.domain.model.ExamTemplate;
import com.tracegrade.domain.model.GradingResult;
import com.tracegrade.domain.model.StudentSubmission;
import com.tracegrade.domain.model.SubmissionStatus;
import com.tracegrade.domain.repository.AnswerRubricRepository;
import com.tracegrade.domain.repository.GradingResultRepository;
import com.tracegrade.domain.repository.StudentSubmissionRepository;
import com.tracegrade.dto.response.GradingResultResponse;
import com.tracegrade.exception.ResourceNotFoundException;
import com.tracegrade.openai.OpenAiService;
import com.tracegrade.openai.dto.GradingRequest;
import com.tracegrade.openai.dto.GradingResponse;
import com.tracegrade.openai.exception.OpenAiException;
import com.tracegrade.openai.exception.OpenAiRateLimitException;

@SuppressWarnings("null")
class GradingServiceImplTest {

    private StudentSubmissionRepository submissionRepository;
    private GradingResultRepository     gradingResultRepository;
    private AnswerRubricRepository      rubricRepository;
    private OpenAiService               openAiService;
    private GradingProperties           gradingProperties;
    private GradingServiceImpl          service;

    private static final UUID SUBMISSION_ID  = UUID.randomUUID();
    private static final UUID TEMPLATE_ID    = UUID.randomUUID();
    private static final UUID RESULT_ID      = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        submissionRepository    = mock(StudentSubmissionRepository.class);
        gradingResultRepository = mock(GradingResultRepository.class);
        rubricRepository        = mock(AnswerRubricRepository.class);
        openAiService           = mock(OpenAiService.class);
        gradingProperties       = new GradingProperties();
        gradingProperties.setConfidenceThreshold(0.80);
        service = new GradingServiceImpl(
                submissionRepository, gradingResultRepository,
                rubricRepository, openAiService,
                gradingProperties, new ObjectMapper()
        );
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private ExamTemplate buildTemplate() {
        ExamTemplate t = new ExamTemplate();
        t.setId(TEMPLATE_ID);
        return t;
    }

    private StudentSubmission buildSubmission(ExamTemplate template) {
        StudentSubmission s = StudentSubmission.builder()
                .assignmentId(UUID.randomUUID())
                .studentId(UUID.randomUUID())
                .examTemplate(template)
                .submissionImageUrls("[\"https://s3.example.com/img.jpg\"]")
                .originalFormat("jpg")
                .status(SubmissionStatus.PENDING)
                .submittedAt(Instant.now())
                .build();
        s.setId(SUBMISSION_ID);
        return s;
    }

    private AnswerRubric buildRubric(ExamTemplate template, int questionNumber) {
        AnswerRubric r = AnswerRubric.builder()
                .examTemplate(template)
                .questionNumber(questionNumber)
                .answerText("Expected answer " + questionNumber)
                .pointsAvailable(new BigDecimal("5.00"))
                .build();
        r.setId(UUID.randomUUID());
        return r;
    }

    private GradingResponse buildAiResponse(int questionNumber, double confidence, boolean illegible) {
        return GradingResponse.builder()
                .questionNumber(questionNumber)
                .pointsAwarded(illegible ? BigDecimal.ZERO : new BigDecimal("4.50"))
                .pointsAvailable(new BigDecimal("5.00"))
                .confidenceScore(confidence)
                .feedback("Feedback for Q" + questionNumber)
                .illegible(illegible)
                .promptTokensUsed(50)
                .completionTokensUsed(100)
                .build();
    }

    private GradingResult buildStoredResult(StudentSubmission submission, boolean needsReview) {
        GradingResult result = GradingResult.builder()
                .submission(submission)
                .gradeId(UUID.randomUUID())
                .aiScore(new BigDecimal("90.00"))
                .finalScore(new BigDecimal("90.00"))
                .confidenceScore(new BigDecimal("95.00"))
                .needsReview(needsReview)
                .questionScores("[{\"questionNumber\":1}]")
                .aiFeedback("Q1: Great answer.")
                .teacherOverride(false)
                .processingTimeMs(350)
                .build();
        result.setId(RESULT_ID);
        return result;
    }

    private void stubSubmissionSave(StudentSubmission submission) {
        when(submissionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private void stubResultSave() {
        when(gradingResultRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    // =========================================================================
    // grade()
    // =========================================================================

    @Nested
    @DisplayName("grade()")
    class GradeTests {

        @Test
        @DisplayName("Should return existing result immediately when submission is already graded")
        void idempotent_returnsExistingResult() {
            StudentSubmission submission = buildSubmission(buildTemplate());
            GradingResult existing = buildStoredResult(submission, false);
            when(gradingResultRepository.findBySubmissionId(SUBMISSION_ID))
                    .thenReturn(Optional.of(existing));

            GradingResultResponse response = service.grade(SUBMISSION_ID);

            assertThat(response.getGradeId()).isEqualTo(existing.getGradeId());
            verify(openAiService, never()).gradeSubmission(any());
            verify(submissionRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when submission does not exist")
        void throwsNotFound_whenSubmissionMissing() {
            when(gradingResultRepository.findBySubmissionId(SUBMISSION_ID))
                    .thenReturn(Optional.empty());
            when(submissionRepository.findById(SUBMISSION_ID))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.grade(SUBMISSION_ID))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("StudentSubmission");
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when submission has no exam template")
        void throwsNotFound_whenExamTemplateNull() {
            StudentSubmission submission = buildSubmission(null);
            when(gradingResultRepository.findBySubmissionId(SUBMISSION_ID))
                    .thenReturn(Optional.empty());
            when(submissionRepository.findById(SUBMISSION_ID))
                    .thenReturn(Optional.of(submission));

            assertThatThrownBy(() -> service.grade(SUBMISSION_ID))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("ExamTemplate");
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when exam template has no rubrics")
        void throwsNotFound_whenNoRubrics() {
            ExamTemplate template = buildTemplate();
            StudentSubmission submission = buildSubmission(template);
            when(gradingResultRepository.findBySubmissionId(SUBMISSION_ID))
                    .thenReturn(Optional.empty());
            when(submissionRepository.findById(SUBMISSION_ID))
                    .thenReturn(Optional.of(submission));
            when(rubricRepository.findByExamTemplateIdOrderByQuestionNumberAsc(TEMPLATE_ID))
                    .thenReturn(List.of());

            assertThatThrownBy(() -> service.grade(SUBMISSION_ID))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("AnswerRubrics");
        }

        @Test
        @DisplayName("Should complete grading with needsReview=false when all confidence scores are high")
        void success_highConfidence_noReview() {
            ExamTemplate template = buildTemplate();
            StudentSubmission submission = buildSubmission(template);
            AnswerRubric rubric = buildRubric(template, 1);
            GradingResponse aiResp = buildAiResponse(1, 0.92, false);

            when(gradingResultRepository.findBySubmissionId(SUBMISSION_ID)).thenReturn(Optional.empty());
            when(submissionRepository.findById(SUBMISSION_ID)).thenReturn(Optional.of(submission));
            when(rubricRepository.findByExamTemplateIdOrderByQuestionNumberAsc(TEMPLATE_ID))
                    .thenReturn(List.of(rubric));
            when(openAiService.gradeSubmission(any())).thenReturn(aiResp);
            stubSubmissionSave(submission);
            stubResultSave();

            GradingResultResponse response = service.grade(SUBMISSION_ID);

            assertThat(response.getNeedsReview()).isFalse();
            assertThat(response.getAiScore()).isEqualByComparingTo("90.00");   // 4.5/5.0 * 100
            assertThat(response.getStatus()).isEqualTo("COMPLETED");
        }

        @Test
        @DisplayName("Should flag needsReview=true when any question has confidence below threshold")
        void success_lowConfidence_reviewFlagged() {
            ExamTemplate template = buildTemplate();
            StudentSubmission submission = buildSubmission(template);
            AnswerRubric rubric = buildRubric(template, 1);
            GradingResponse aiResp = buildAiResponse(1, 0.70, false);  // below 0.80 threshold

            when(gradingResultRepository.findBySubmissionId(SUBMISSION_ID)).thenReturn(Optional.empty());
            when(submissionRepository.findById(SUBMISSION_ID)).thenReturn(Optional.of(submission));
            when(rubricRepository.findByExamTemplateIdOrderByQuestionNumberAsc(TEMPLATE_ID))
                    .thenReturn(List.of(rubric));
            when(openAiService.gradeSubmission(any())).thenReturn(aiResp);
            stubSubmissionSave(submission);
            stubResultSave();

            GradingResultResponse response = service.grade(SUBMISSION_ID);

            assertThat(response.getNeedsReview()).isTrue();
        }

        @Test
        @DisplayName("Should flag needsReview=true when any answer is illegible regardless of confidence")
        void success_illegibleAnswer_reviewFlagged() {
            ExamTemplate template = buildTemplate();
            StudentSubmission submission = buildSubmission(template);
            AnswerRubric rubric = buildRubric(template, 1);
            // high confidence but illegible
            GradingResponse aiResp = buildAiResponse(1, 0.95, true);

            when(gradingResultRepository.findBySubmissionId(SUBMISSION_ID)).thenReturn(Optional.empty());
            when(submissionRepository.findById(SUBMISSION_ID)).thenReturn(Optional.of(submission));
            when(rubricRepository.findByExamTemplateIdOrderByQuestionNumberAsc(TEMPLATE_ID))
                    .thenReturn(List.of(rubric));
            when(openAiService.gradeSubmission(any())).thenReturn(aiResp);
            stubSubmissionSave(submission);
            stubResultSave();

            GradingResultResponse response = service.grade(SUBMISSION_ID);

            assertThat(response.getNeedsReview()).isTrue();
        }

        @Test
        @DisplayName("Should produce a valid JSON array in questionScores with correct fields")
        void success_questionScoresIsValidJson() throws JsonProcessingException {
            ExamTemplate template = buildTemplate();
            StudentSubmission submission = buildSubmission(template);
            AnswerRubric rubric = buildRubric(template, 1);
            GradingResponse aiResp = buildAiResponse(1, 0.92, false);

            when(gradingResultRepository.findBySubmissionId(SUBMISSION_ID)).thenReturn(Optional.empty());
            when(submissionRepository.findById(SUBMISSION_ID)).thenReturn(Optional.of(submission));
            when(rubricRepository.findByExamTemplateIdOrderByQuestionNumberAsc(TEMPLATE_ID))
                    .thenReturn(List.of(rubric));
            when(openAiService.gradeSubmission(any())).thenReturn(aiResp);
            stubSubmissionSave(submission);
            stubResultSave();

            GradingResultResponse response = service.grade(SUBMISSION_ID);

            ObjectMapper mapper = new ObjectMapper();
            var array = mapper.readTree(response.getQuestionScores());
            assertThat(array.isArray()).isTrue();
            assertThat(array.size()).isEqualTo(1);
            var entry = array.get(0);
            assertThat(entry.has("questionNumber")).isTrue();
            assertThat(entry.has("pointsAwarded")).isTrue();
            assertThat(entry.has("confidenceScore")).isTrue();
            assertThat(entry.has("illegible")).isTrue();
            assertThat(entry.has("feedback")).isTrue();
            assertThat(entry.get("questionNumber").asInt()).isEqualTo(1);
        }

        @Test
        @DisplayName("Should concatenate per-question feedback with Q-prefix in aiFeedback")
        void success_aiFeedbackConcatenated() {
            ExamTemplate template = buildTemplate();
            StudentSubmission submission = buildSubmission(template);
            AnswerRubric rubric1 = buildRubric(template, 1);
            AnswerRubric rubric2 = buildRubric(template, 2);
            GradingResponse aiResp1 = buildAiResponse(1, 0.90, false);
            GradingResponse aiResp2 = buildAiResponse(2, 0.85, false);

            when(gradingResultRepository.findBySubmissionId(SUBMISSION_ID)).thenReturn(Optional.empty());
            when(submissionRepository.findById(SUBMISSION_ID)).thenReturn(Optional.of(submission));
            when(rubricRepository.findByExamTemplateIdOrderByQuestionNumberAsc(TEMPLATE_ID))
                    .thenReturn(List.of(rubric1, rubric2));
            when(openAiService.gradeSubmission(any()))
                    .thenReturn(aiResp1)
                    .thenReturn(aiResp2);
            stubSubmissionSave(submission);
            stubResultSave();

            GradingResultResponse response = service.grade(SUBMISSION_ID);

            assertThat(response.getAiFeedback()).contains("Q1: Feedback for Q1");
            assertThat(response.getAiFeedback()).contains("Q2: Feedback for Q2");
        }

        @Test
        @DisplayName("Should persist FAILED result and throw GradingFailedException on OpenAiException")
        void aiFailure_openAiException_persistsFailedResult() {
            ExamTemplate template = buildTemplate();
            StudentSubmission submission = buildSubmission(template);
            AnswerRubric rubric = buildRubric(template, 1);

            when(gradingResultRepository.findBySubmissionId(SUBMISSION_ID)).thenReturn(Optional.empty());
            when(submissionRepository.findById(SUBMISSION_ID)).thenReturn(Optional.of(submission));
            when(rubricRepository.findByExamTemplateIdOrderByQuestionNumberAsc(TEMPLATE_ID))
                    .thenReturn(List.of(rubric));
            when(openAiService.gradeSubmission(any()))
                    .thenThrow(new OpenAiException("GRADING", "API error", 500));
            stubSubmissionSave(submission);
            stubResultSave();

            assertThatThrownBy(() -> service.grade(SUBMISSION_ID))
                    .isInstanceOf(GradingFailedException.class)
                    .satisfies(e -> assertThat(((GradingFailedException) e).getSubmissionId())
                            .isEqualTo(SUBMISSION_ID));

            ArgumentCaptor<GradingResult> resultCaptor = ArgumentCaptor.forClass(GradingResult.class);
            verify(gradingResultRepository).save(resultCaptor.capture());
            GradingResult saved = resultCaptor.getValue();
            assertThat(saved.getNeedsReview()).isTrue();
            assertThat(saved.getQuestionScores()).isEqualTo("[]");
            assertThat(saved.getAiScore()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(saved.getConfidenceScore()).isEqualByComparingTo(BigDecimal.ZERO);
        }

        @Test
        @DisplayName("Should persist FAILED result and throw GradingFailedException on OpenAiRateLimitException")
        void aiFailure_rateLimitException_persistsFailedResult() {
            ExamTemplate template = buildTemplate();
            StudentSubmission submission = buildSubmission(template);
            AnswerRubric rubric = buildRubric(template, 1);

            when(gradingResultRepository.findBySubmissionId(SUBMISSION_ID)).thenReturn(Optional.empty());
            when(submissionRepository.findById(SUBMISSION_ID)).thenReturn(Optional.of(submission));
            when(rubricRepository.findByExamTemplateIdOrderByQuestionNumberAsc(TEMPLATE_ID))
                    .thenReturn(List.of(rubric));
            when(openAiService.gradeSubmission(any()))
                    .thenThrow(new OpenAiRateLimitException("GRADING", 4));
            stubSubmissionSave(submission);
            stubResultSave();

            assertThatThrownBy(() -> service.grade(SUBMISSION_ID))
                    .isInstanceOf(GradingFailedException.class);

            verify(gradingResultRepository).save(any(GradingResult.class));
            // submission is saved twice: once for PROCESSING, once for FAILED
            verify(submissionRepository, times(2)).save(any(StudentSubmission.class));
            // final status on the mutable submission object must be FAILED
            assertThat(submission.getStatus()).isEqualTo(SubmissionStatus.FAILED);
        }

        @Test
        @DisplayName("Should fail fast and persist FAILED result when the second of multiple rubrics fails")
        void partialFailure_secondRubricFails_persistsFailedResult() {
            ExamTemplate template = buildTemplate();
            StudentSubmission submission = buildSubmission(template);
            AnswerRubric rubric1 = buildRubric(template, 1);
            AnswerRubric rubric2 = buildRubric(template, 2);

            when(gradingResultRepository.findBySubmissionId(SUBMISSION_ID)).thenReturn(Optional.empty());
            when(submissionRepository.findById(SUBMISSION_ID)).thenReturn(Optional.of(submission));
            when(rubricRepository.findByExamTemplateIdOrderByQuestionNumberAsc(TEMPLATE_ID))
                    .thenReturn(List.of(rubric1, rubric2));
            when(openAiService.gradeSubmission(any(GradingRequest.class)))
                    .thenReturn(buildAiResponse(1, 0.90, false))
                    .thenThrow(new OpenAiException("GRADING", "API error", 500));
            stubSubmissionSave(submission);
            stubResultSave();

            assertThatThrownBy(() -> service.grade(SUBMISSION_ID))
                    .isInstanceOf(GradingFailedException.class);

            verify(gradingResultRepository).save(any(GradingResult.class));
        }

        @Test
        @DisplayName("Should record a non-negative processingTimeMs")
        void success_processingTimeMsRecorded() {
            ExamTemplate template = buildTemplate();
            StudentSubmission submission = buildSubmission(template);
            AnswerRubric rubric = buildRubric(template, 1);

            when(gradingResultRepository.findBySubmissionId(SUBMISSION_ID)).thenReturn(Optional.empty());
            when(submissionRepository.findById(SUBMISSION_ID)).thenReturn(Optional.of(submission));
            when(rubricRepository.findByExamTemplateIdOrderByQuestionNumberAsc(TEMPLATE_ID))
                    .thenReturn(List.of(rubric));
            when(openAiService.gradeSubmission(any())).thenReturn(buildAiResponse(1, 0.90, false));
            stubSubmissionSave(submission);
            stubResultSave();

            GradingResultResponse response = service.grade(SUBMISSION_ID);

            assertThat(response.getProcessingTimeMs()).isNotNull();
            assertThat(response.getProcessingTimeMs()).isGreaterThanOrEqualTo(0);
        }

        @Test
        @DisplayName("Should generate a non-null gradeId on every successful grading")
        void success_gradeIdIsGenerated() {
            ExamTemplate template = buildTemplate();
            StudentSubmission submission = buildSubmission(template);
            AnswerRubric rubric = buildRubric(template, 1);

            when(gradingResultRepository.findBySubmissionId(SUBMISSION_ID)).thenReturn(Optional.empty());
            when(submissionRepository.findById(SUBMISSION_ID)).thenReturn(Optional.of(submission));
            when(rubricRepository.findByExamTemplateIdOrderByQuestionNumberAsc(TEMPLATE_ID))
                    .thenReturn(List.of(rubric));
            when(openAiService.gradeSubmission(any())).thenReturn(buildAiResponse(1, 0.90, false));
            stubSubmissionSave(submission);
            stubResultSave();

            GradingResultResponse response = service.grade(SUBMISSION_ID);

            assertThat(response.getGradeId()).isNotNull();
        }

        @Test
        @DisplayName("Should aggregate aiScore correctly across multiple rubric questions")
        void success_multipleRubrics_aggregatedScore() {
            ExamTemplate template = buildTemplate();
            StudentSubmission submission = buildSubmission(template);
            AnswerRubric rubric1 = buildRubric(template, 1);
            AnswerRubric rubric2 = buildRubric(template, 2);

            // Q1: 4.5/5, Q2: 4.5/5 → total 9/10 → 90.00
            GradingResponse aiResp1 = buildAiResponse(1, 0.90, false);
            GradingResponse aiResp2 = buildAiResponse(2, 0.85, false);

            when(gradingResultRepository.findBySubmissionId(SUBMISSION_ID)).thenReturn(Optional.empty());
            when(submissionRepository.findById(SUBMISSION_ID)).thenReturn(Optional.of(submission));
            when(rubricRepository.findByExamTemplateIdOrderByQuestionNumberAsc(TEMPLATE_ID))
                    .thenReturn(List.of(rubric1, rubric2));
            when(openAiService.gradeSubmission(any()))
                    .thenReturn(aiResp1)
                    .thenReturn(aiResp2);
            stubSubmissionSave(submission);
            stubResultSave();

            GradingResultResponse response = service.grade(SUBMISSION_ID);

            assertThat(response.getAiScore()).isEqualByComparingTo("90.00");
            assertThat(response.getNeedsReview()).isFalse();
        }
    }

    // =========================================================================
    // getResult()
    // =========================================================================

    @Nested
    @DisplayName("getResult()")
    class GetResultTests {

        @Test
        @DisplayName("Should return mapped response when a GradingResult exists for the submission")
        void returnsResponse_whenResultExists() {
            StudentSubmission submission = buildSubmission(buildTemplate());
            GradingResult existing = buildStoredResult(submission, false);
            when(gradingResultRepository.findBySubmissionId(SUBMISSION_ID))
                    .thenReturn(Optional.of(existing));

            GradingResultResponse response = service.getResult(SUBMISSION_ID);

            assertThat(response.getGradeId()).isEqualTo(existing.getGradeId());
            assertThat(response.getAiScore()).isEqualByComparingTo("90.00");
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when no GradingResult exists for the submission")
        void throwsNotFound_whenNoResult() {
            when(gradingResultRepository.findBySubmissionId(SUBMISSION_ID))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.getResult(SUBMISSION_ID))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("GradingResult");
        }
    }

    // =========================================================================
    // getPendingReviews()
    // =========================================================================

    @Nested
    @DisplayName("getPendingReviews()")
    class GetPendingReviewsTests {

        @Test
        @DisplayName("Should return mapped list of results flagged for review")
        void returnsMappedList_whenPendingReviewsExist() {
            StudentSubmission submission = buildSubmission(buildTemplate());
            GradingResult result1 = buildStoredResult(submission, true);
            GradingResult result2 = buildStoredResult(submission, true);
            when(gradingResultRepository.findByNeedsReviewTrueAndReviewedAtIsNull())
                    .thenReturn(List.of(result1, result2));

            List<GradingResultResponse> responses = service.getPendingReviews();

            assertThat(responses).hasSize(2);
            assertThat(responses).allMatch(r -> r.getNeedsReview());
        }

        @Test
        @DisplayName("Should return an empty list when no results are pending review")
        void returnsEmptyList_whenNonePending() {
            when(gradingResultRepository.findByNeedsReviewTrueAndReviewedAtIsNull())
                    .thenReturn(List.of());

            List<GradingResultResponse> responses = service.getPendingReviews();

            assertThat(responses).isEmpty();
        }
    }
}
