package com.tracegrade.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Class record returned by the Classes API")
public class ClassResponse {

    @Schema(description = "Unique identifier of the class")
    private UUID id;

    @Schema(description = "UUID of the school this class belongs to")
    private UUID schoolId;

    @Schema(description = "UUID of the teacher who owns this class")
    private UUID teacherId;

    @Schema(description = "Name of the class", example = "Math 101 Period 3")
    private String name;

    @Schema(description = "Subject area", example = "Mathematics")
    private String subject;

    @Schema(description = "Class period or section", example = "Period 3")
    private String period;

    @Schema(description = "Academic school year", example = "2025-2026")
    private String schoolYear;

    @Schema(description = "Grading scale configuration")
    private String gradingScale;

    @Schema(description = "Whether the class is currently active", example = "true")
    private Boolean isActive;

    @Schema(description = "UTC timestamp when the class was created")
    private Instant createdAt;

    @Schema(description = "UTC timestamp of the last update")
    private Instant updatedAt;
}
