package com.tracegrade.dto.response;

import java.math.BigDecimal;
import java.util.List;
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
@Schema(description = "A single student row in the gradebook with one cell per assignment column")
public class GradebookStudentRowResponse {

    @Schema(description = "Student UUID")
    private UUID studentId;

    @Schema(description = "Full name of the student (first + last)")
    private String studentName;

    @Schema(description = "One cell per assignment column; null status means no grade recorded yet")
    private List<GradebookCellResponse> cells;

    @Schema(description = "Weighted average across all graded assignments; null when no graded work exists")
    private BigDecimal average;
}
