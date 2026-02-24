package com.tracegrade.dto.request;

import com.tracegrade.domain.model.DifficultyLevel;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;

import jakarta.validation.constraints.Pattern;
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
@Schema(description = "Request body for partially updating an existing exam template")
public class UpdateExamTemplateRequest {

    @Pattern(regexp = ".*\\S.*", message = "Exam name must not be blank")
    @Size(min = 1, max = 200, message = "Exam name must be between 1 and 200 characters")
    @Schema(description = "Updated template name", example = "Algebra Midterm v2")
    private String name;

    @Pattern(regexp = ".*\\S.*", message = "Subject must not be blank")
    @Size(min = 1, max = 100, message = "Subject must be between 1 and 100 characters")
    @Schema(description = "Updated subject", example = "Mathematics")
    private String subject;

    @Pattern(regexp = ".*\\S.*", message = "Topic must not be blank")
    @Size(min = 1, max = 200, message = "Topic must be between 1 and 200 characters")
    @Schema(description = "Updated topic", example = "Quadratic Functions")
    private String topic;

    @Pattern(regexp = ".*\\S.*", message = "Grade level must not be blank")
    @Size(min = 1, max = 50, message = "Grade level must be between 1 and 50 characters")
    @Schema(description = "Updated grade level", example = "11th Grade")
    private String gradeLevel;

    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    @Schema(description = "Updated description")
    private String description;

    @Schema(description = "Updated difficulty level", example = "HARD")
    private DifficultyLevel difficultyLevel;

    @Positive(message = "Total points must be positive")
    @Schema(description = "Updated total points", example = "120")
    private BigDecimal totalPoints;

    @Pattern(regexp = ".*\\S.*", message = "Questions JSON must not be blank")
    @Size(min = 1, message = "Questions JSON must not be blank")
    @Schema(description = "Updated serialized questions JSON", example = "[{\"number\":1,\"question\":\"Explain theorem\"}]")
    private String questionsJson;
}
