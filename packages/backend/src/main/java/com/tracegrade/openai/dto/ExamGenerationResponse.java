package com.tracegrade.openai.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamGenerationResponse {

    private String subject;
    private String topic;
    private String gradeLevel;
    private List<GeneratedQuestion> questions;
    private int promptTokensUsed;
    private int completionTokensUsed;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GeneratedQuestion {
        private int questionNumber;
        private String questionText;
        private String expectedAnswer;
        private String gradingGuidance;
        private double pointsAvailable;
    }
}
