package com.tracegrade.dto.request;

import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
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
@Schema(description = "Request body for updating a grade category (all fields optional)")
public class UpdateGradeCategoryRequest {

    @Size(max = 100)
    @Schema(
            description = "Updated name of the grade category",
            example = "Quizzes"
    )
    private String name;

    @DecimalMin("0.0")
    @DecimalMax("100.0")
    @Schema(
            description = "Updated weight as a percentage (0-100)",
            example = "40.00"
    )
    private BigDecimal weight;

    @Min(0)
    @Schema(
            description = "Updated number of lowest-scoring items to drop",
            example = "1"
    )
    private Integer dropLowest;

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$")
    @Schema(
            description = "Updated hex color code for UI display (nullable)",
            example = "#33FF57"
    )
    private String color;
}
