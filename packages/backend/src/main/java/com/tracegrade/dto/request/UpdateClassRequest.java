package com.tracegrade.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
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
@Schema(description = "Request body for partially updating a class. Only provided fields are changed.")
public class UpdateClassRequest {

    @Size(max = 200, message = "Class name must not exceed 200 characters")
    @Schema(description = "Updated class name", example = "Math 101 Period 4")
    private String name;

    @Size(max = 100, message = "Subject must not exceed 100 characters")
    @Schema(description = "Updated subject area", example = "Algebra")
    private String subject;

    @Size(max = 50, message = "Period must not exceed 50 characters")
    @Schema(description = "Updated class period", example = "Period 4")
    private String period;

    @Size(max = 20, message = "School year must not exceed 20 characters")
    @Schema(description = "Updated school year", example = "2025-2026")
    private String schoolYear;

    @Schema(description = "Updated grading scale configuration")
    private String gradingScale;

    @Schema(description = "Set to false to archive/deactivate the class", example = "true")
    private Boolean isActive;
}
