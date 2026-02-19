package com.tracegrade.openai.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GradingRequest {

    /** Pre-signed S3 URL or base64 data URL of the student submission image */
    @NotBlank
    private String submissionImageUrl;

    @NotNull
    private Integer questionNumber;

    @NotBlank
    private String expectedAnswer;

    private String acceptableVariations;

    private String gradingNotes;

    @NotNull
    private BigDecimal pointsAvailable;
}
