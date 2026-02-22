package com.tracegrade.dto.request;

import java.math.BigDecimal;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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
@Schema(description = "Request body for creating an answer rubric entry for one question in an exam template")
public class CreateAnswerRubricRequest {

    // examTemplateId is provided via the URL path variable; this field is optional on the request body
    @Schema(description = "UUID of the exam template (optional — taken from URL path when omitted)")
    private UUID examTemplateId;

    @NotNull(message = "Question number is required")
    @Positive(message = "Question number must be positive")
    @Schema(description = "1-based question number, unique within the exam template", example = "3", requiredMode = Schema.RequiredMode.REQUIRED)
    private Integer questionNumber;

    @Schema(description = "Model answer text for this question", example = "The mitochondria is the powerhouse of the cell.")
    private String answerText;

    @Schema(description = "URL of an image showing the model answer (e.g. a diagram)", example = "https://storage.example.com/rubrics/q3-diagram.png")
    private String answerImageUrl;

    @NotNull(message = "Points available is required")
    @Positive(message = "Points available must be positive")
    @Schema(description = "Maximum points a student can earn for this question", example = "5", requiredMode = Schema.RequiredMode.REQUIRED)
    private BigDecimal pointsAvailable;

    @Schema(description = "Comma-separated list of acceptable alternative answers", example = "powerhouse, energy factory")
    private String acceptableVariations;

    @Schema(description = "Freeform grading notes visible only to teachers and the AI grader", example = "Award full marks if student mentions ATP production.")
    private String gradingNotes;
}
