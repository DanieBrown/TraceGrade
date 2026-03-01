package com.tracegrade.dto.response;

import java.math.BigDecimal;
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
@Schema(description = "A single assignment column in the gradebook")
public class GradebookColumnResponse {

    @Schema(description = "Assignment UUID — used as column identifier")
    private UUID id;

    @Schema(description = "Assignment name displayed as column header")
    private String label;

    @Schema(description = "Name of the grade category this assignment belongs to")
    private String categoryLabel;

    @Schema(description = "Maximum points possible for this assignment")
    private BigDecimal maxPoints;
}
