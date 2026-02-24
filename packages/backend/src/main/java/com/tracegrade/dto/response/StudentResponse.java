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
@Schema(description = "Student record returned by the Students API")
public class StudentResponse {

    @Schema(description = "Unique identifier of the student")
    private UUID id;

    @Schema(description = "UUID of the school this student belongs to")
    private UUID schoolId;

    @Schema(description = "Student's first name", example = "Jane")
    private String firstName;

    @Schema(description = "Student's last name", example = "Doe")
    private String lastName;

    @Schema(description = "Student's email address", example = "jane.doe@school.edu")
    private String email;

    @Schema(description = "Optional external student ID / roll number", example = "STU-2026-001")
    private String studentNumber;

    @Schema(description = "Whether the student is currently active", example = "true")
    private Boolean isActive;

    @Schema(description = "UTC timestamp when the student record was created")
    private Instant createdAt;

    @Schema(description = "UTC timestamp of the last update")
    private Instant updatedAt;
}
