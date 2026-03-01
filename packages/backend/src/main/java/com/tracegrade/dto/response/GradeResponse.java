package com.tracegrade.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.tracegrade.domain.model.GradeStatus;

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
@Schema(description = "Grade record returned by the Grades API")
public class GradeResponse {

    @Schema(description = "Unique identifier of the grade")
    private UUID id;

    @Schema(description = "UUID of the assignment this grade belongs to")
    private UUID assignmentId;

    @Schema(description = "UUID of the student")
    private UUID studentId;

    @Schema(description = "Points earned; null if not graded or excused")
    private BigDecimal pointsEarned;

    @Schema(description = "Grading status")
    private GradeStatus status;

    @Schema(description = "Teacher notes or feedback; null if none")
    private String notes;

    @Schema(description = "UTC timestamp when the grade was recorded; null if pending")
    private Instant gradedAt;

    @Schema(description = "UTC timestamp when this record was created")
    private Instant createdAt;

    @Schema(description = "UTC timestamp of the last update to this record")
    private Instant updatedAt;
}
