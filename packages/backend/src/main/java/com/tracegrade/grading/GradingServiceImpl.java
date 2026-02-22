package com.tracegrade.grading;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tracegrade.domain.model.AnswerRubric;
import com.tracegrade.domain.model.GradingResult;
import com.tracegrade.domain.model.StudentSubmission;
import com.tracegrade.domain.model.SubmissionStatus;
import com.tracegrade.domain.repository.AnswerRubricRepository;
import com.tracegrade.domain.repository.GradingResultRepository;
import com.tracegrade.domain.repository.StudentSubmissionRepository;
import com.tracegrade.dto.request.GradingReviewRequest;
import com.tracegrade.dto.response.GradingEnqueuedResponse;
import com.tracegrade.dto.response.GradingResultResponse;
import com.tracegrade.exception.ResourceNotFoundException;
import com.tracegrade.openai.OpenAiService;
import com.tracegrade.openai.dto.GradingRequest;
import com.tracegrade.openai.dto.GradingResponse;
import com.tracegrade.openai.exception.OpenAiException;
import com.tracegrade.sqs.GradingJobPublisher;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class GradingServiceImpl implements GradingService {

    private final StudentSubmissionRepository submissionRepository;
    private final GradingResultRepository gradingResultRepository;
    private final AnswerRubricRepository rubricRepository;
    private final OpenAiService openAiService;
    private final GradingProperties gradingProperties;
    private final ObjectMapper objectMapper;

    /** Injected only when sqs.enabled=true; null otherwise (synchronous fallback). */
    @Autowired(required = false)
    private GradingJobPublisher gradingJobPublisher;

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    @Override
    @Transactional
    public GradingEnqueuedResponse enqueueGrading(UUID submissionId) {
        if (gradingResultRepository.findBySubmissionId(submissionId).isPresent()) {
            log.info("Grading result already exists for submissionId={}, skipping enqueue", submissionId);
            return GradingEnqueuedResponse.builder()
                    .submissionId(submissionId)
                    .status("ALREADY_GRADED")
                    .enqueuedAt(Instant.now())
                    .build();
        }

        if (gradingJobPublisher != null) {
            StudentSubmission submission = submissionRepository.findById(submissionId)
                    .orElseThrow(() -> new ResourceNotFoundException("StudentSubmission", submissionId));
            submission.setStatus(SubmissionStatus.PENDING);
            submissionRepository.save(submission);

            gradingJobPublisher.publishGradingJob(submissionId);

            return GradingEnqueuedResponse.builder()
                    .submissionId(submissionId)
                    .status("QUEUED")
                    .enqueuedAt(Instant.now())
                    .build();
        }

        // SQS not configured — fall back to synchronous grading
        log.debug("SQS not enabled; grading submissionId={} synchronously", submissionId);
        GradingResultResponse result = grade(submissionId);
        return GradingEnqueuedResponse.builder()
                .submissionId(submissionId)
                .status(result.getStatus())
                .enqueuedAt(Instant.now())
                .build();
    }

    @Override
    @Transactional(noRollbackFor = GradingFailedException.class)
    public GradingResultResponse grade(UUID submissionId) {
        return gradingResultRepository.findBySubmissionId(submissionId)
                .map(this::toResponse)
                .orElseGet(() -> doGrade(submissionId));
    }

    @Override
    @Transactional(readOnly = true)
    public GradingResultResponse getResult(UUID submissionId) {
        return gradingResultRepository.findBySubmissionId(submissionId)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("GradingResult for submission", submissionId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<GradingResultResponse> getPendingReviews() {
        return gradingResultRepository.findByNeedsReviewTrueAndReviewedAtIsNull()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public GradingResultResponse reviewGrade(UUID gradeId, GradingReviewRequest request) {
        GradingResult result = gradingResultRepository.findByGradeId(gradeId)
                .orElseThrow(() -> new ResourceNotFoundException("GradingResult", gradeId));

        result.setFinalScore(request.getFinalScore());
        result.setTeacherOverride(request.getTeacherOverride());
        result.setReviewedAt(Instant.now());
        result.setReviewedBy(null); // no authentication layer yet
        result.setNeedsReview(false);

        if (request.getQuestionScores() != null) {
            result.setQuestionScores(request.getQuestionScores());
        }

        gradingResultRepository.save(result);
        log.info("Review saved gradeId={} teacherOverride={} finalScore={}",
                gradeId, request.getTeacherOverride(), request.getFinalScore());
        return toResponse(result);
    }

    // -------------------------------------------------------------------------
    // Core grading flow
    // -------------------------------------------------------------------------

    private GradingResultResponse doGrade(UUID submissionId) {
        StudentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("StudentSubmission", submissionId));

        if (submission.getExamTemplate() == null) {
            throw new ResourceNotFoundException("ExamTemplate for submission", submissionId);
        }

        UUID templateId = submission.getExamTemplate().getId();
        List<AnswerRubric> rubrics =
                rubricRepository.findByExamTemplateIdOrderByQuestionNumberAsc(templateId);

        if (rubrics.isEmpty()) {
            throw new ResourceNotFoundException("AnswerRubrics for ExamTemplate", templateId);
        }

        String imageUrl = extractFirstImageUrl(submission.getSubmissionImageUrls(), submissionId);

        submission.setStatus(SubmissionStatus.PROCESSING);
        submissionRepository.save(submission);

        long startMs = System.currentTimeMillis();
        List<GradingResponse> aiResponses = new ArrayList<>();

        for (AnswerRubric rubric : rubrics) {
            String expectedAnswer = rubric.getAnswerText() != null
                    ? rubric.getAnswerText()
                    : "Refer to rubric.";

            GradingRequest req = GradingRequest.builder()
                    .submissionImageUrl(imageUrl)
                    .questionNumber(rubric.getQuestionNumber())
                    .expectedAnswer(expectedAnswer)
                    .acceptableVariations(rubric.getAcceptableVariations())
                    .gradingNotes(rubric.getGradingNotes())
                    .pointsAvailable(rubric.getPointsAvailable())
                    .build();

            try {
                aiResponses.add(openAiService.gradeSubmission(req));
            } catch (OpenAiException ex) {
                log.error("AI grading failed for submissionId={} questionNumber={}: {}",
                        submissionId, rubric.getQuestionNumber(), ex.getMessage(), ex);
                int processingMs = (int) (System.currentTimeMillis() - startMs);
                persistFailedResult(submission, processingMs);
                throw new GradingFailedException(submissionId, ex);
            }
        }

        int processingMs = (int) (System.currentTimeMillis() - startMs);
        return aggregateAndPersist(submission, rubrics, aiResponses, processingMs);
    }

    private void persistFailedResult(StudentSubmission submission, int processingMs) {
        submission.setStatus(SubmissionStatus.FAILED);
        submissionRepository.save(submission);

        GradingResult failedResult = GradingResult.builder()
                .submission(submission)
                .gradeId(UUID.randomUUID())
                .aiScore(BigDecimal.ZERO)
                .finalScore(BigDecimal.ZERO)
                .confidenceScore(BigDecimal.ZERO)
                .needsReview(true)
                .questionScores("[]")
                .aiFeedback("Grading failed due to AI service error. Manual review required.")
                .teacherOverride(false)
                .processingTimeMs(processingMs)
                .build();

        gradingResultRepository.save(failedResult);
        log.warn("Persisted FAILED GradingResult for submissionId={}", submission.getId());
    }

    private GradingResultResponse aggregateAndPersist(StudentSubmission submission,
                                                      List<AnswerRubric> rubrics,
                                                      List<GradingResponse> aiResponses,
                                                      int processingMs) {
        BigDecimal totalAwarded = BigDecimal.ZERO;
        BigDecimal totalAvailable = BigDecimal.ZERO;
        double totalConfidence = 0.0;
        boolean needsReview = false;
        List<QuestionScoreEntry> entries = new ArrayList<>();
        StringBuilder feedbackBuilder = new StringBuilder();

        for (GradingResponse r : aiResponses) {
            totalAwarded = totalAwarded.add(r.getPointsAwarded());
            totalAvailable = totalAvailable.add(r.getPointsAvailable());
            totalConfidence += r.getConfidenceScore();

            if (r.getConfidenceScore() < gradingProperties.getConfidenceThreshold() || r.isIllegible()) {
                needsReview = true;
            }

            BigDecimal confidencePct = BigDecimal.valueOf(r.getConfidenceScore() * 100)
                    .setScale(2, RoundingMode.HALF_UP);

            entries.add(new QuestionScoreEntry(
                    r.getQuestionNumber(),
                    r.getPointsAwarded(),
                    r.getPointsAvailable(),
                    confidencePct,
                    r.isIllegible(),
                    r.getFeedback()
            ));

            if (!feedbackBuilder.isEmpty()) {
                feedbackBuilder.append("\n");
            }
            feedbackBuilder.append("Q").append(r.getQuestionNumber()).append(": ").append(r.getFeedback());
        }

        BigDecimal aiScore = totalAvailable.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : totalAwarded.divide(totalAvailable, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100))
                        .setScale(2, RoundingMode.HALF_UP);

        BigDecimal avgConfidence = BigDecimal.valueOf((totalConfidence / rubrics.size()) * 100)
                .setScale(2, RoundingMode.HALF_UP);

        String questionScoresJson;
        try {
            questionScoresJson = objectMapper.writeValueAsString(entries);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize questionScores for submissionId={}", submission.getId(), e);
            questionScoresJson = "[]";
        }

        GradingResult result = GradingResult.builder()
                .submission(submission)
                .gradeId(UUID.randomUUID())
                .aiScore(aiScore)
                .finalScore(aiScore)
                .confidenceScore(avgConfidence)
                .needsReview(needsReview)
                .questionScores(questionScoresJson)
                .aiFeedback(feedbackBuilder.toString())
                .teacherOverride(false)
                .processingTimeMs(processingMs)
                .build();

        gradingResultRepository.save(result);

        submission.setStatus(SubmissionStatus.COMPLETED);
        submissionRepository.save(submission);

        log.info("Grading completed submissionId={} aiScore={} needsReview={} processingMs={}",
                submission.getId(), aiScore, needsReview, processingMs);

        return toResponse(result);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private String extractFirstImageUrl(String submissionImageUrls, UUID submissionId) {
        try {
            var node = objectMapper.readTree(submissionImageUrls);
            if (node.isArray() && node.size() > 0) {
                return node.get(0).asText();
            }
        } catch (Exception e) {
            log.error("Failed to parse submissionImageUrls for submissionId={}: {}",
                    submissionId, submissionImageUrls, e);
        }
        throw new ResourceNotFoundException("submission image URL for submission", submissionId);
    }

    private GradingResultResponse toResponse(GradingResult result) {
        return GradingResultResponse.builder()
                .gradeId(result.getGradeId())
                .submissionId(result.getSubmission().getId())
                .status(result.getSubmission().getStatus().name())
                .aiScore(result.getAiScore())
                .finalScore(result.getFinalScore())
                .confidenceScore(result.getConfidenceScore())
                .needsReview(result.getNeedsReview())
                .questionScores(result.getQuestionScores())
                .aiFeedback(result.getAiFeedback())
                .teacherOverride(result.getTeacherOverride())
                .reviewedBy(result.getReviewedBy())
                .reviewedAt(result.getReviewedAt())
                .submissionImageUrl(safeFirstImageUrl(result.getSubmission().getSubmissionImageUrls()))
                .processingTimeMs(result.getProcessingTimeMs())
                .createdAt(result.getCreatedAt())
                .updatedAt(result.getUpdatedAt())
                .build();
    }

    /** Returns the first image URL from a JSON array string, or null if unavailable. */
    private String safeFirstImageUrl(String submissionImageUrls) {
        try {
            var node = objectMapper.readTree(submissionImageUrls);
            if (node.isArray() && node.size() > 0) {
                return node.get(0).asText();
            }
        } catch (Exception e) {
            log.debug("Could not parse submissionImageUrls: {}", submissionImageUrls);
        }
        return null;
    }

    // -------------------------------------------------------------------------
    // Inner types
    // -------------------------------------------------------------------------

    record QuestionScoreEntry(
            int questionNumber,
            BigDecimal pointsAwarded,
            BigDecimal pointsAvailable,
            BigDecimal confidenceScore,
            boolean illegible,
            String feedback
    ) {}
}
