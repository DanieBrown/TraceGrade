package com.tracegrade.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
@Schema(description = "Request body for creating an assignment")
public class CreateAssignmentRequest {

    @NotNull
    @Schema(
            description = "UUID of the grade category this assignment belongs to",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private UUID categoryId;

    @NotBlank
    @Size(max = 200)
    @Schema(
            description = "Name of the assignment",
            example = "Chapter 1 Quiz",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private String name;

    @Size(max = 5000)
    @Schema(
            description = "Optional description of the assignment (max 5000 characters)",
            example = "Covers chapters 1-3 of the textbook"
    )
    private String description;

    @NotNull
    @DecimalMin("0.01")
    @Schema(
            description = "Maximum points for this assignment (must be > 0)",
            example = "100.00",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private BigDecimal maxPoints;

    @Schema(
            description = "Due date for the assignment (nullable, no future constraint — past dates are valid)",
            example = "2026-05-15"
    )
    private LocalDate dueDate;

    @Schema(
            description = "Date the assignment was assigned to students (nullable)",
            example = "2026-05-01"
    )
    private LocalDate assignedDate;

    @Schema(
            description = "Whether the assignment is visible to students; defaults to true if omitted",
            example = "true"
    )
    private Boolean isPublished;
}
