package com.tracegrade.dto.request;

import java.math.BigDecimal;
import java.time.Instant;

import com.tracegrade.domain.model.GradeStatus;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request body for updating a grade (all fields optional — partial update)")
public class UpdateGradeRequest {

    @DecimalMin("0.0")
    @Schema(
            description = "Updated points earned (null clears the value)",
            example = "90.00"
    )
    private BigDecimal pointsEarned;

    @Schema(
            description = "Updated grading status"
    )
    private GradeStatus status;

    @Schema(
            description = "Updated teacher notes or feedback"
    )
    private String notes;

    @Schema(
            description = "Updated UTC timestamp when the grade was recorded"
    )
    private Instant gradedAt;
}
