package com.tracegrade.openai.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ExamGenerationRequest {

    @NotBlank
    private String subject;

    @NotBlank
    private String topic;

    @NotNull
    private String gradeLevel;

    @Min(1)
    @Max(50)
    private int questionCount;

    /** EASY, MEDIUM, or HARD — matches DifficultyLevel enum names */
    private String difficultyLevel;

    private String additionalInstructions;
}
