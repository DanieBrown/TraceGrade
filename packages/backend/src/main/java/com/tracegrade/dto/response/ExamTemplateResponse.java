package com.tracegrade.dto.response;

import com.tracegrade.domain.model.DifficultyLevel;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Exam template record returned by the Exam Templates API")
public class ExamTemplateResponse {

    @Schema(description = "Unique identifier of the exam template")
    private UUID id;

    @Schema(description = "UUID of the teacher who owns this template")
    private UUID teacherId;

    @Schema(description = "Optional assignment reference associated with this template")
    private UUID assignmentId;

    @Schema(description = "Template display name", example = "Algebra Midterm")
    private String name;

    @Schema(description = "Academic subject", example = "Mathematics")
    private String subject;

    @Schema(description = "Topic or unit focus", example = "Linear Equations")
    private String topic;

    @Schema(description = "Optional description")
    private String description;

    @Schema(description = "Target grade level", example = "10th Grade")
    private String gradeLevel;

    @Schema(description = "Difficulty level", example = "MEDIUM")
    private DifficultyLevel difficultyLevel;

    @Schema(description = "Maximum score available for this exam", example = "100")
    private BigDecimal totalPoints;

    @Schema(description = "Serialized JSON that defines exam questions")
    private String questionsJson;

    @Schema(description = "Optional generated PDF URL")
    private String pdfUrl;

    @Schema(description = "Optional prompt used for generation")
    private String generationPrompt;

    @Schema(description = "UTC timestamp when the template was created")
    private Instant createdAt;

    @Schema(description = "UTC timestamp when the template was last updated")
    private Instant updatedAt;
}