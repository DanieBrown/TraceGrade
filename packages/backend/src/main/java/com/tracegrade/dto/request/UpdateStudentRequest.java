package com.tracegrade.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
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
@Schema(description = "Request body for partially updating a student. Only provided fields are changed.")
public class UpdateStudentRequest {

    @Size(max = 100)
    @Schema(description = "Updated first name", example = "Janet")
    private String firstName;

    @Size(max = 100)
    @Schema(description = "Updated last name", example = "Smith")
    private String lastName;

    @Email
    @Size(max = 200)
    @Schema(description = "Updated email address (must be unique within the school)", example = "janet.smith@school.edu")
    private String email;

    @Size(max = 50)
    @Schema(description = "Updated external student ID / roll number", example = "STU-2026-002")
    private String studentNumber;

    @Schema(description = "Set to false to deactivate the student", example = "true")
    private Boolean isActive;
}
