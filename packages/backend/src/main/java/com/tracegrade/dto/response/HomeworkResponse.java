package com.tracegrade.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Homework record returned by the Homework API")
public class HomeworkResponse {

    @Schema(description = "Unique identifier of the homework")
    private UUID id;

    @Schema(description = "UUID of the school this homework belongs to")
    private UUID schoolId;

    @Schema(description = "Homework title", example = "Chapter 5 Review")
    private String title;

    @Schema(description = "Description of the homework assignment")
    private String description;

    @Schema(description = "Class name this homework is for")
    private String className;

    @Schema(description = "Due date")
    private LocalDate dueDate;

    @Schema(description = "Current status", example = "DRAFT")
    private String status;

    @Schema(description = "Maximum points for the assignment")
    private BigDecimal maxPoints;

    @Schema(description = "UTC timestamp when the homework was created")
    private Instant createdAt;

    @Schema(description = "UTC timestamp of the last update")
    private Instant updatedAt;
}
