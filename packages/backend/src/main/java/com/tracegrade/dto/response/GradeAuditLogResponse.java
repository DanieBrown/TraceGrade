package com.tracegrade.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.tracegrade.domain.model.AuditEventType;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Read-only response DTO for a single audit log entry.
 * All entity fields are included; nullable fields are represented as null.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Audit log entry for an AI grading event or teacher override")
public class GradeAuditLogResponse {

    @Schema(description = "Unique audit log record ID")
    private UUID id;

    @Schema(description = "ID of the student submission that triggered this event")
    private UUID submissionId;

    @Schema(description = "Student ID derived from the submission at write time; null if unavailable")
    private UUID studentId;

    @Schema(description = "Exam template ID derived from the submission at write time; null if unavailable")
    private UUID examTemplateId;

    @Schema(description = "Type of audit event", example = "AI_GRADING_SUCCESS")
    private AuditEventType eventType;

    @Schema(description = "AI-assigned score at the time of the event; 0.00 for failure events")
    private BigDecimal originalAiScore;

    @Schema(description = "AI confidence score (0–100) at the time of the event")
    private BigDecimal confidenceLevel;

    @Schema(description = "Teacher-modified final score; null for AI events")
    private BigDecimal teacherModifiedScore;

    @Schema(description = "Teacher-supplied override reason; null for AI events")
    private String overrideReason;

    @Schema(description = "Reviewer (teacher) user ID; null until auth layer is wired")
    private UUID reviewerId;

    @Schema(description = "Grade ID from the associated GradingResult; may be null")
    private UUID gradingResultGradeId;

    @Schema(description = "Authoritative event timestamp (ISO-8601 UTC)")
    private Instant createdAt;

    @Schema(description = "Record last-updated timestamp (ISO-8601 UTC)")
    private Instant updatedAt;
}
