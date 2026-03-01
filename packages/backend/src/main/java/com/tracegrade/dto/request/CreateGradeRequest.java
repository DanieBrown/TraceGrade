package com.tracegrade.dto.request;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.tracegrade.domain.model.GradeStatus;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request body for creating a grade for a student's assignment")
public class CreateGradeRequest {

    @NotNull
    @Schema(
            description = "UUID of the student being graded",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private UUID studentId;

    @DecimalMin("0.0")
    @Schema(
            description = "Points earned by the student (null if not yet graded or excused)",
            example = "85.50"
    )
    private BigDecimal pointsEarned;

    @NotNull
    @Schema(
            description = "Grading status of the assignment",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private GradeStatus status;

    @Schema(
            description = "Optional teacher notes or feedback",
            example = "Good effort on the essay section"
    )
    private String notes;

    @Schema(
            description = "UTC timestamp when the grade was recorded; null if not yet graded",
            example = "2026-03-01T10:00:00Z"
    )
    private Instant gradedAt;
}
