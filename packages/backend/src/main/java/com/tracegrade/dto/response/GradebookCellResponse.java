package com.tracegrade.dto.response;

import java.math.BigDecimal;
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
@Schema(description = "A single grade cell in the gradebook (student × assignment intersection)")
public class GradebookCellResponse {

    @Schema(description = "Assignment UUID this cell corresponds to (matches column id)")
    private UUID columnId;

    @Schema(description = "Points earned by the student; null if not yet graded")
    private BigDecimal pointsEarned;

    @Schema(description = "Grading status for this cell")
    private GradeStatus status;
}
