package com.tracegrade.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Grade category record returned by the Grade Categories API")
public class GradeCategoryResponse {

    @Schema(description = "Unique identifier of the grade category")
    private UUID id;

    @Schema(description = "UUID of the class this category belongs to")
    private UUID classId;

    @Schema(description = "Name of the grade category")
    private String name;

    @Schema(description = "Weight of this category as a percentage (0-100)")
    private BigDecimal weight;

    @Schema(description = "Number of lowest-scoring items to drop")
    private Integer dropLowest;

    @Schema(description = "Hex color code for UI display; null if not set")
    private String color;

    @Schema(description = "UTC timestamp when the category was created")
    private Instant createdAt;

    @Schema(description = "UTC timestamp of the last update to the category")
    private Instant updatedAt;
}
