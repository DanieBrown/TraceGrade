package com.tracegrade.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "Full AI grading result for a student submission")
public class GradingResultResponse {

    @Schema(description = "Unique identifier of the grading result")
    private UUID gradeId;

    @Schema(description = "UUID of the submission that was graded")
    private UUID submissionId;

    @Schema(description = "Grading outcome: COMPLETED or FAILED", example = "COMPLETED",
            allowableValues = {"COMPLETED", "FAILED"})
    private String status;

    @Schema(description = "AI-assigned score as a percentage (0–100); null when grading failed before aggregation",
            example = "88.5")
    private BigDecimal aiScore;

    @Schema(description = "Final score (equals aiScore unless a teacher has overridden it)", example = "90.0")
    private BigDecimal finalScore;

    @Schema(description = "Average AI confidence across all questions, on a 0–100 scale", example = "92.3")
    private BigDecimal confidenceScore;

    @Schema(description = "true when the confidence fell below the threshold and teacher review is required",
            example = "false")
    private Boolean needsReview;

    @Schema(description = "JSON array of per-question scoring detail",
            example = "[{\"question\":1,\"score\":4,\"maxScore\":5}]")
    private String questionScores;

    @Schema(description = "Concatenated per-question AI feedback text")
    private String aiFeedback;

    @Schema(description = "true if a teacher manually overrode the AI score", example = "false")
    private Boolean teacherOverride;

    @Schema(description = "UUID of the teacher who performed the review")
    private UUID reviewedBy;

    @Schema(description = "UTC timestamp when the teacher review was submitted")
    private Instant reviewedAt;

    @Schema(description = "URL of the first submission image; null if unavailable")
    private String submissionImageUrl;

    @Schema(description = "Time taken to process and grade the submission, in milliseconds", example = "1240")
    private Integer processingTimeMs;

    @Schema(description = "UTC timestamp when the grading result was created")
    private Instant createdAt;

    @Schema(description = "UTC timestamp of the last update")
    private Instant updatedAt;
}
