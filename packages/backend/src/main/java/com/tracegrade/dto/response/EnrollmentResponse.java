package com.tracegrade.dto.response;

import java.time.Instant;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Enrollment record returned by the Enrollments API")
public class EnrollmentResponse {

    @Schema(description = "Unique identifier of the enrollment")
    private UUID id;

    @Schema(description = "UUID of the class this enrollment belongs to")
    private UUID classId;

    @Schema(description = "UUID of the enrolled student")
    private UUID studentId;

    @Schema(description = "UTC timestamp when the student was enrolled")
    private Instant enrolledAt;

    @Schema(description = "UTC timestamp when the student was dropped; null if still active")
    private Instant droppedAt;

    @Schema(description = "UTC timestamp when the enrollment record was created")
    private Instant createdAt;

    @Schema(description = "UTC timestamp of the last update to the enrollment record")
    private Instant updatedAt;
}
