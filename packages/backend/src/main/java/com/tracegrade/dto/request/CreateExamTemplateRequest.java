package com.tracegrade.dto.request;

import com.tracegrade.domain.model.DifficultyLevel;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
@Schema(description = "Request body for creating an exam template")
public class CreateExamTemplateRequest {

    @Schema(description = "Optional assignment reference associated with this template", example = "0f8fad5b-d9cb-469f-a165-70867728950e")
    private UUID assignmentId;

    @NotBlank(message = "Exam name is required")
    @Size(max = 200, message = "Exam name must not exceed 200 characters")
    @Schema(description = "Template display name", requiredMode = Schema.RequiredMode.REQUIRED, example = "Algebra Midterm")
    private String name;

    @Size(max = 100, message = "Subject must not exceed 100 characters")
    @Schema(description = "Academic subject", example = "Mathematics")
    private String subject;

    @Size(max = 200, message = "Topic must not exceed 200 characters")
    @Schema(description = "Specific unit or topic", example = "Linear Equations")
    private String topic;

    @Size(max = 50, message = "Grade level must not exceed 50 characters")
    @Schema(description = "Target grade level", example = "10th Grade")
    private String gradeLevel;

    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    @Schema(description = "Optional freeform template description")
    private String description;

    @Schema(description = "Difficulty level", example = "MEDIUM")
    private DifficultyLevel difficultyLevel;

    @NotNull(message = "Total points is required")
    @Positive(message = "Total points must be positive")
    @Schema(description = "Maximum score available for this exam", requiredMode = Schema.RequiredMode.REQUIRED, example = "100")
    private BigDecimal totalPoints;

    @NotBlank(message = "Questions JSON is required")
    @Schema(description = "Serialized JSON array/object describing exam questions", requiredMode = Schema.RequiredMode.REQUIRED, example = "[{\"number\":1,\"question\":\"Solve for x\"}]")
    private String questionsJson;
}
