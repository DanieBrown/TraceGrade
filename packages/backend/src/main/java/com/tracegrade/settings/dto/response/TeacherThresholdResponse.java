package com.tracegrade.settings.dto.response;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "Effective threshold configuration for the authenticated teacher")
public class TeacherThresholdResponse {

    @Schema(description = "Effective threshold used for grading review decisions", example = "0.80")
    private BigDecimal effectiveThreshold;

    @Schema(description = "Source of the effective threshold", allowableValues = { "teacher_override", "default" }, example = "teacher_override")
    private String source;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    @Schema(description = "Teacher-specific stored threshold; null when default is used", example = "0.85", nullable = true)
    private BigDecimal teacherThreshold;
}
