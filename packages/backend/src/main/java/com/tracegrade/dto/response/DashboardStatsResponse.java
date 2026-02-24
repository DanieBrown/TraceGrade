package com.tracegrade.dto.response;

import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "Summary dashboard statistics for a school")
public class DashboardStatsResponse {

    @Schema(description = "Count of active students in the school", example = "128")
    private long totalStudents;

    @Schema(description = "Count of active classes; temporary placeholder until class domain is available", example = "0")
    private int classCount;

    @Schema(description = "Count of grading results created in the last 7 days", example = "47")
    private long gradedThisWeek;

    @Schema(description = "Count of grading results requiring manual review", example = "5")
    private long pendingReviews;

    @Schema(description = "Average score rounded to one decimal place", example = "84.7")
    private BigDecimal classAverage;

    @Schema(description = "Letter grade derived from classAverage", example = "B", allowableValues = {"A", "B", "C", "D", "F"})
    private String letterGrade;
}