package com.tracegrade.dto.request;

import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request body for a teacher reviewing and optionally overriding an AI grading result")
public class GradingReviewRequest {

    @NotNull(message = "Final score is required")
    @DecimalMin(value = "0", message = "Final score must be >= 0")
    @DecimalMax(value = "100", message = "Final score must be <= 100")
    @Schema(description = "Teacher-confirmed final score as a percentage (0–100)", example = "85.5", requiredMode = Schema.RequiredMode.REQUIRED)
    private BigDecimal finalScore;

    @NotNull(message = "teacherOverride flag is required")
    @Schema(description = "true if the teacher is overriding the AI score; false if confirming it", example = "true", requiredMode = Schema.RequiredMode.REQUIRED)
    private Boolean teacherOverride;

    /** Optional updated per-question scores JSON; when null the existing scores are kept */
    @Schema(description = "Updated per-question scores as a JSON array; omit to keep the existing AI scores",
            example = "[{\"question\":1,\"score\":4},{\"question\":2,\"score\":3}]")
    private String questionScores;

    /** Optional free-text reason for overriding the AI score; null if not provided */
    @Size(max = 4000, message = "Override reason must not exceed 4000 characters")
    @Schema(description = "Optional reason for overriding AI score")
    private String overrideReason;
}
