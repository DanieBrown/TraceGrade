package com.tracegrade.dto.request;

import com.tracegrade.domain.model.SchoolType;
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

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Request body for creating a new school")
public class CreateSchoolRequest {

    @NotBlank
    @Size(max = 200)
    @Schema(description = "Full display name of the school", example = "Springfield High School", requiredMode = Schema.RequiredMode.REQUIRED)
    private String name;

    @NotNull
    @Schema(description = "School classification type", example = "HIGH", requiredMode = Schema.RequiredMode.REQUIRED)
    private SchoolType schoolType;

    @Size(max = 500)
    @Schema(description = "Physical address of the school", example = "742 Evergreen Terrace, Springfield")
    private String address;

    @Size(max = 20)
    @Schema(description = "Contact phone number", example = "+1-555-0100")
    private String phone;

    @Email
    @Size(max = 200)
    @Schema(description = "Contact email address", example = "admin@springfield-high.edu")
    private String email;

    @Size(max = 100)
    @Schema(description = "IANA timezone identifier for the school", example = "America/New_York")
    private String timezone;
}
