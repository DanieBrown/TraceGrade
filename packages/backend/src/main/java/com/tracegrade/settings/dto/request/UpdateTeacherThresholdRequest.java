package com.tracegrade.settings.dto.request;

import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
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
@Schema(description = "Request body for updating the authenticated teacher grading confidence threshold")
public class UpdateTeacherThresholdRequest {

    @NotNull
    @DecimalMin(value = "0.00", message = "Threshold must be greater than or equal to 0.00")
    @DecimalMax(value = "1.00", message = "Threshold must be less than or equal to 1.00")
    @Digits(integer = 1, fraction = 2, message = "Threshold must have at most 2 decimal places")
    @Schema(description = "Confidence threshold on a decimal scale from 0.00 to 1.00", example = "0.80", requiredMode = Schema.RequiredMode.REQUIRED)
    private BigDecimal threshold;
}
