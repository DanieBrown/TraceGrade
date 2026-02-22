package com.tracegrade.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "Answer rubric record for a single question in an exam template")
public class AnswerRubricResponse {

    @Schema(description = "Unique identifier of the rubric")
    private UUID id;

    @Schema(description = "UUID of the exam template this rubric belongs to")
    private UUID examTemplateId;

    @Schema(description = "1-based question number", example = "3")
    private Integer questionNumber;

    @Schema(description = "Model answer text", example = "The mitochondria is the powerhouse of the cell.")
    private String answerText;

    @Schema(description = "URL of the model answer image")
    private String answerImageUrl;

    @Schema(description = "Maximum points available for this question", example = "5")
    private BigDecimal pointsAvailable;

    @Schema(description = "Acceptable alternative answers", example = "powerhouse, energy factory")
    private String acceptableVariations;

    @Schema(description = "Grading notes for teachers and the AI grader")
    private String gradingNotes;

    @Schema(description = "UTC timestamp when the rubric was created")
    private Instant createdAt;

    @Schema(description = "UTC timestamp of the last update")
    private Instant updatedAt;
}
