package com.tracegrade.grading;

import java.util.List;
import java.util.UUID;

import com.tracegrade.dto.request.GradingReviewRequest;
import com.tracegrade.dto.response.GradingEnqueuedResponse;
import com.tracegrade.dto.response.GradingResultResponse;

public interface GradingService {

    /**
     * Enqueues a grading job for async processing via SQS. If SQS is not configured,
     * falls back to synchronous grading. Idempotent: if a GradingResult already exists,
     * no new job is enqueued.
     *
     * @param submissionId the UUID of the StudentSubmission to grade
     * @return a response indicating the job status (QUEUED, COMPLETED, or ALREADY_GRADED)
     * @throws com.tracegrade.exception.ResourceNotFoundException if the submission is not found
     */
    GradingEnqueuedResponse enqueueGrading(UUID submissionId);

    /**
     * Grades a student submission against its exam template's answer rubrics using
     * the OpenAI Vision API. Idempotent: if a GradingResult already exists for the
     * submission, the existing result is returned immediately.
     *
     * @param submissionId the UUID of the StudentSubmission to grade
     * @return the persisted GradingResultResponse
     * @throws com.tracegrade.exception.ResourceNotFoundException if the submission,
     *         exam template, or rubrics are not found
     * @throws GradingFailedException if the AI call fails after all retries;
     *         a FAILED GradingResult is persisted before this is thrown
     */
    GradingResultResponse grade(UUID submissionId);

    /**
     * Returns the grading result for a submission.
     *
     * @throws com.tracegrade.exception.ResourceNotFoundException if no result exists
     */
    GradingResultResponse getResult(UUID submissionId);

    /**
     * Returns all grading results flagged for manual review that have not yet been reviewed.
     */
    List<GradingResultResponse> getPendingReviews();

    /**
     * Records a teacher's review decision for a grading result. Updates finalScore,
     * teacherOverride, reviewedAt, and optionally questionScores. Sets needsReview to false.
     *
     * @param gradeId the semantic grade UUID (not the JPA entity id)
     * @param request the teacher's review decision
     * @return the updated GradingResultResponse
     * @throws com.tracegrade.exception.ResourceNotFoundException if no result with the given gradeId exists
     */
    GradingResultResponse reviewGrade(UUID gradeId, GradingReviewRequest request);
}
