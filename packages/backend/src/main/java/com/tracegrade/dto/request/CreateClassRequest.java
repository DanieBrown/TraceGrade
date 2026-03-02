package com.tracegrade.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request body for creating a new class")
public class CreateClassRequest {

    @Schema(description = "UUID of the school (set automatically from URL path)")
    private UUID schoolId;

    @Schema(description = "UUID of the teacher (set automatically from authenticated user)")
    private UUID teacherId;

    @NotBlank(message = "Class name is required")
    @Size(max = 200, message = "Class name must not exceed 200 characters")
    @Schema(description = "Name of the class", example = "Math 101 Period 3", requiredMode = Schema.RequiredMode.REQUIRED)
    private String name;

    @Size(max = 100, message = "Subject must not exceed 100 characters")
    @Schema(description = "Subject area", example = "Mathematics")
    private String subject;

    @Size(max = 50, message = "Period must not exceed 50 characters")
    @Schema(description = "Class period or section", example = "Period 3")
    private String period;

    @NotBlank(message = "School year is required")
    @Size(max = 20, message = "School year must not exceed 20 characters")
    @Schema(description = "Academic school year", example = "2025-2026", requiredMode = Schema.RequiredMode.REQUIRED)
    private String schoolYear;

    @Schema(description = "Optional grading scale configuration as JSON")
    private String gradingScale;
}
