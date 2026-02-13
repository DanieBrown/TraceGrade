package com.tracegrade.dto.request;

import java.math.BigDecimal;
import java.util.UUID;

import com.tracegrade.validation.ValidScoreRange;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
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
public class CreateGradingResultRequest {

    @NotNull(message = "Submission ID is required")
    private UUID submissionId;

    private UUID gradeId;

    @NotNull(message = "AI score is required")
    @DecimalMin(value = "0", message = "AI score must be >= 0")
    private BigDecimal aiScore;

    @NotNull(message = "Confidence score is required")
    @ValidScoreRange(min = 0, max = 100, message = "Confidence score must be between 0 and 100")
    private BigDecimal confidenceScore;

    @NotBlank(message = "Question scores JSON is required")
    private String questionScores;

    private String aiFeedback;
}
