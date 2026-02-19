package com.tracegrade.dto.request;

import java.math.BigDecimal;

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
public class UpdateAnswerRubricRequest {

    @Positive(message = "Question number must be positive")
    private Integer questionNumber;

    private String answerText;

    private String answerImageUrl;

    @Positive(message = "Points available must be positive")
    private BigDecimal pointsAvailable;

    private String acceptableVariations;

    private String gradingNotes;
}
