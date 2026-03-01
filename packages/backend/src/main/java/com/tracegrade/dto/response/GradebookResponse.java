package com.tracegrade.dto.response;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Composite gradebook payload for a single class: columns (assignments) + rows (student grades)")
public class GradebookResponse {

    @Schema(description = "UUID of the class this gradebook belongs to")
    private UUID classId;

    @Schema(description = "Display label for the class (name + optional period)")
    private String classLabel;

    @Schema(description = "Ordered list of assignment columns")
    private List<GradebookColumnResponse> columns;

    @Schema(description = "One row per enrolled student; empty list when class has no enrollments")
    private List<GradebookStudentRowResponse> rows;
}
