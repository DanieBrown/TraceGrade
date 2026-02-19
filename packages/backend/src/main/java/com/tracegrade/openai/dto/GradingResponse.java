package com.tracegrade.openai.dto;

import java.math.BigDecimal;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GradingResponse {

    private int questionNumber;
    private BigDecimal pointsAwarded;
    private BigDecimal pointsAvailable;

    /** Confidence in the grading decision, 0.0 (none) to 1.0 (certain) */
    private double confidenceScore;

    /** Human-readable feedback explaining the grade */
    private String feedback;

    /** True if the model could not read the handwriting */
    private boolean illegible;

    private int promptTokensUsed;
    private int completionTokensUsed;
}
