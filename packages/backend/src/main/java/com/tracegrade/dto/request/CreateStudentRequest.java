package com.tracegrade.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
@Schema(description = "Request body for enrolling a new student")
public class CreateStudentRequest {

    @NotNull
    @Schema(description = "UUID of the school this student belongs to", requiredMode = Schema.RequiredMode.REQUIRED, example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
    private UUID schoolId;

    @NotBlank
    @Size(max = 100)
    @Schema(description = "Student's first name", example = "Jane", requiredMode = Schema.RequiredMode.REQUIRED)
    private String firstName;

    @NotBlank
    @Size(max = 100)
    @Schema(description = "Student's last name", example = "Doe", requiredMode = Schema.RequiredMode.REQUIRED)
    private String lastName;

    @NotBlank
    @Email
    @Size(max = 200)
    @Schema(description = "Student's email address (unique per school)", example = "jane.doe@school.edu", requiredMode = Schema.RequiredMode.REQUIRED)
    private String email;

    @Size(max = 50)
    @Schema(description = "Optional external student ID / roll number", example = "STU-2026-001")
    private String studentNumber;
}
