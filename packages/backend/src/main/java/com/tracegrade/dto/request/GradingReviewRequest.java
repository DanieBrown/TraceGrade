package com.tracegrade.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
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
public class GradingReviewRequest {

    @NotNull(message = "Final score is required")
    @DecimalMin(value = "0", message = "Final score must be >= 0")
    @DecimalMax(value = "100", message = "Final score must be <= 100")
    private BigDecimal finalScore;

    @NotNull(message = "teacherOverride flag is required")
    private Boolean teacherOverride;

    /** Optional updated per-question scores JSON; when null the existing scores are kept */
    private String questionScores;
}
