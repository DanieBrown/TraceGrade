package com.tracegrade.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request body for creating a homework assignment")
public class CreateHomeworkRequest {

    @Schema(description = "UUID of the school this homework belongs to (set automatically from the URL path)", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
    private UUID schoolId;

    @NotBlank
    @Size(max = 200)
    @Schema(description = "Homework title", example = "Chapter 5 Review", requiredMode = Schema.RequiredMode.REQUIRED)
    private String title;

    @Size(max = 5000)
    @Schema(description = "Optional description of the homework assignment", example = "Complete exercises 1-20 from Chapter 5")
    private String description;

    @Size(max = 200)
    @Schema(description = "Class name this homework is for", example = "Algebra II — Period 3")
    private String className;

    @Schema(description = "Due date in ISO format", example = "2026-03-15")
    private LocalDate dueDate;

    @Positive
    @Schema(description = "Maximum points for the assignment", example = "100")
    private BigDecimal maxPoints;
}
