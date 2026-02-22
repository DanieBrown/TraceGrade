package com.tracegrade.dto.response;

import com.tracegrade.domain.model.SchoolType;
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
@Schema(description = "School record returned by the Schools API")
public class SchoolResponse {

    @Schema(description = "Unique identifier of the school")
    private UUID id;

    @Schema(description = "Full display name of the school", example = "Springfield High School")
    private String name;

    @Schema(description = "School classification type", example = "HIGH")
    private SchoolType schoolType;

    @Schema(description = "Physical address of the school", example = "742 Evergreen Terrace, Springfield")
    private String address;

    @Schema(description = "Contact phone number", example = "+1-555-0100")
    private String phone;

    @Schema(description = "Contact email address", example = "admin@springfield-high.edu")
    private String email;

    @Schema(description = "IANA timezone identifier", example = "America/New_York")
    private String timezone;

    @Schema(description = "Whether the school is currently active", example = "true")
    private Boolean isActive;

    @Schema(description = "UTC timestamp when the school was created")
    private Instant createdAt;

    @Schema(description = "UTC timestamp of the last update")
    private Instant updatedAt;
}
