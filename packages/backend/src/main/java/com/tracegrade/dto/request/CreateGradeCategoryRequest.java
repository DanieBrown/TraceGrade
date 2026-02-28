package com.tracegrade.dto.request;

import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
@Schema(description = "Request body for creating a grade category")
public class CreateGradeCategoryRequest {

    @NotBlank
    @Size(max = 100)
    @Schema(
            description = "Name of the grade category",
            example = "Tests",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private String name;

    @NotNull
    @DecimalMin("0.0")
    @DecimalMax("100.0")
    @Schema(
            description = "Weight of this category as a percentage (0-100)",
            example = "60.00",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private BigDecimal weight;

    @NotNull
    @Min(0)
    @Schema(
            description = "Number of lowest-scoring items to drop; defaults to 0",
            example = "0",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private Integer dropLowest;

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$")
    @Schema(
            description = "Hex color code for UI display (nullable)",
            example = "#FF5733"
    )
    private String color;
}
