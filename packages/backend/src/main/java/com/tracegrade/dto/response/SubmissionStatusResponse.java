package com.tracegrade.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "Current status and grading summary for a student submission")
public class SubmissionStatusResponse {

    @Schema(description = "Unique identifier of the submission")
    private UUID submissionId;

    @Schema(description = "UUID of the assignment this submission belongs to")
    private UUID assignmentId;

    @Schema(description = "UUID of the student who made the submission")
    private UUID studentId;

    @Schema(description = "Current processing status", example = "COMPLETED",
            allowableValues = {"PENDING", "PROCESSING", "COMPLETED", "FAILED"})
    private String status;

    @Schema(description = "UTC timestamp when the submission was uploaded")
    private Instant submittedAt;

    @Schema(description = "UTC timestamp when the status last changed")
    private Instant updatedAt;

    @Schema(description = "Grading summary; present only once a GradingResult has been linked")
    private GradingResultSummary gradingResult;

    @Getter
    @Builder
    @Schema(description = "Condensed grading result summary embedded in the submission status")
    public static class GradingResultSummary {

        @Schema(description = "UUID of the grading result")
        private UUID gradeId;

        @Schema(description = "AI-assigned score as a percentage (0–100)", example = "88.5")
        private BigDecimal aiScore;

        @Schema(description = "Final score after any teacher override", example = "90.0")
        private BigDecimal finalScore;

        @Schema(description = "Average AI confidence (0–100)", example = "92.3")
        private BigDecimal confidenceScore;

        @Schema(description = "true when teacher review is required", example = "false")
        private Boolean needsReview;

        @Schema(description = "true if a teacher overrode the AI score", example = "false")
        private Boolean teacherOverride;
    }
}
