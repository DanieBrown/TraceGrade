package com.tracegrade.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
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
public class UpdateExamTemplateRequest {

    @Size(max = 200, message = "Exam name must not exceed 200 characters")
    private String name;

    @Size(max = 100, message = "Subject must not exceed 100 characters")
    private String subject;

    @Size(max = 200, message = "Topic must not exceed 200 characters")
    private String topic;

    private String difficultyLevel;

    @Positive(message = "Total points must be positive")
    private BigDecimal totalPoints;

    private String questionsJson;
}
