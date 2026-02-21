package com.tracegrade.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SubmissionStatusResponse {

    private UUID submissionId;
    private UUID assignmentId;
    private UUID studentId;

    /** SubmissionStatus name: PENDING, PROCESSING, COMPLETED, or FAILED */
    private String status;

    private Instant submittedAt;

    /** Reflects when the status last changed (populated by @PreUpdate on BaseEntity) */
    private Instant updatedAt;

    /** Non-null only when a GradingResult record has been linked to this submission */
    private GradingResultSummary gradingResult;

    @Getter
    @Builder
    public static class GradingResultSummary {
        private UUID gradeId;
        private BigDecimal aiScore;
        private BigDecimal finalScore;
        private BigDecimal confidenceScore;
        private Boolean needsReview;
        private Boolean teacherOverride;
    }
}
