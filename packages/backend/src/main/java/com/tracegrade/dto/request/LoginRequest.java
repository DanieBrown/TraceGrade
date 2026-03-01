package com.tracegrade.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
@Schema(description = "Request body for user login")
public class LoginRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be a valid email address")
    @Schema(description = "User email address", example = "teacher@school.edu")
    private String email;

    @NotBlank(message = "Password is required")
    @Schema(description = "User password", example = "Secure123!")
    private String password;
}
