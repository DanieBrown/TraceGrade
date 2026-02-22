package com.tracegrade.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GradingResultResponse {

    private UUID gradeId;
    private UUID submissionId;

    /** SubmissionStatus name: COMPLETED or FAILED */
    private String status;

    /** Score as a percentage (0–100), null on failure before aggregation */
    private BigDecimal aiScore;

    /** Same as aiScore until a teacher override is applied */
    private BigDecimal finalScore;

    /** Average confidence across all questions, on 0–100 scale */
    private BigDecimal confidenceScore;

    private Boolean needsReview;

    /** JSON array of per-question scoring detail */
    private String questionScores;

    /** Concatenated per-question AI feedback */
    private String aiFeedback;

    private Boolean teacherOverride;
    private UUID    reviewedBy;
    private Instant reviewedAt;

    /** First image URL from the student's submission; null if unavailable */
    private String submissionImageUrl;

    private Integer processingTimeMs;
    private Instant createdAt;
    private Instant updatedAt;
}
