package com.tracegrade.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AnswerRubricResponse {

    private UUID id;
    private UUID examTemplateId;
    private Integer questionNumber;
    private String answerText;
    private String answerImageUrl;
    private BigDecimal pointsAvailable;
    private String acceptableVariations;
    private String gradingNotes;
    private Instant createdAt;
    private Instant updatedAt;
}
