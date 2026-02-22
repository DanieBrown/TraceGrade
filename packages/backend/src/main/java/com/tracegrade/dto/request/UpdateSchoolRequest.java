package com.tracegrade.dto.request;

import com.tracegrade.domain.model.SchoolType;
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
@Schema(description = "Request body for partially updating a school. Only provided fields are changed.")
public class UpdateSchoolRequest {

    @Size(max = 200)
    @Schema(description = "Updated display name of the school", example = "Springfield Academy")
    private String name;

    @Schema(description = "Updated school classification type", example = "UNIVERSITY")
    private SchoolType schoolType;

    @Size(max = 500)
    @Schema(description = "Updated physical address", example = "1 University Drive, Springfield")
    private String address;

    @Size(max = 20)
    @Schema(description = "Updated contact phone number", example = "+1-555-0200")
    private String phone;

    @Email
    @Size(max = 200)
    @Schema(description = "Updated contact email address", example = "info@springfield-academy.edu")
    private String email;

    @Size(max = 100)
    @Schema(description = "Updated IANA timezone identifier", example = "America/Chicago")
    private String timezone;

    @Schema(description = "Set to false to deactivate the school", example = "true")
    private Boolean isActive;
}
