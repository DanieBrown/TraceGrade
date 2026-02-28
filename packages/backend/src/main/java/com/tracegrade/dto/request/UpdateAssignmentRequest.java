package com.tracegrade.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
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
@Schema(description = "Request body for updating an assignment (all fields optional)")
public class UpdateAssignmentRequest {

    @Schema(
            description = "Updated UUID of the grade category (must belong to same class)",
            example = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    )
    private UUID categoryId;

    @Size(max = 200)
    @Schema(
            description = "Updated name of the assignment",
            example = "Chapter 2 Quiz"
    )
    private String name;

    @Size(max = 5000)
    @Schema(
            description = "Updated description of the assignment (max 5000 characters)",
            example = "Covers chapters 4-6"
    )
    private String description;

    @DecimalMin("0.01")
    @Schema(
            description = "Updated maximum points (must be > 0 if provided)",
            example = "50.00"
    )
    private BigDecimal maxPoints;

    @Schema(
            description = "Updated due date (nullable)",
            example = "2026-06-01"
    )
    private LocalDate dueDate;

    @Schema(
            description = "Updated assigned date (nullable)",
            example = "2026-05-20"
    )
    private LocalDate assignedDate;

    @Schema(
            description = "Updated published state",
            example = "false"
    )
    private Boolean isPublished;
}
