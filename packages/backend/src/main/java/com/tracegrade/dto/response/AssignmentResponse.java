package com.tracegrade.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Assignment record returned by the Assignments API")
public class AssignmentResponse {

    @Schema(description = "Unique identifier of the assignment")
    private UUID id;

    @Schema(description = "UUID of the class this assignment belongs to")
    private UUID classId;

    @Schema(description = "UUID of the grade category this assignment is in")
    private UUID categoryId;

    @Schema(description = "Name of the assignment")
    private String name;

    @Schema(description = "Optional description of the assignment; null if not set")
    private String description;

    @Schema(description = "Maximum points achievable on this assignment")
    private BigDecimal maxPoints;

    @Schema(description = "Due date for the assignment; null if not set")
    private LocalDate dueDate;

    @Schema(description = "Date the assignment was assigned; null if not set")
    private LocalDate assignedDate;

    @Schema(description = "Whether the assignment is visible to students")
    private Boolean isPublished;

    @Schema(description = "UTC timestamp when the assignment was created")
    private Instant createdAt;

    @Schema(description = "UTC timestamp of the last update to the assignment")
    private Instant updatedAt;
}
