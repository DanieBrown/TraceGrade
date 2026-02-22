package com.tracegrade.dto.request;

import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;
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
@Schema(description = "Request body for updating an existing answer rubric. Only provided fields are changed.")
public class UpdateAnswerRubricRequest {

    @Positive(message = "Question number must be positive")
    @Schema(description = "Updated 1-based question number", example = "4")
    private Integer questionNumber;

    @Schema(description = "Updated model answer text", example = "The nucleus controls cell activity.")
    private String answerText;

    @Schema(description = "Updated URL of the model answer image", example = "https://storage.example.com/rubrics/q4-diagram.png")
    private String answerImageUrl;

    @Positive(message = "Points available must be positive")
    @Schema(description = "Updated maximum points for this question", example = "10")
    private BigDecimal pointsAvailable;

    @Schema(description = "Updated list of acceptable alternative answers", example = "nucleus, control centre")
    private String acceptableVariations;

    @Schema(description = "Updated grading notes for teachers and the AI grader", example = "Partial credit allowed for mentioning DNA storage.")
    private String gradingNotes;
}
