package com.tracegrade.domain.model;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Append-only audit log entry for AI grading events and teacher overrides.
 * <p>
 * No FK constraints on UUID columns — the audit table must remain intact
 * even if the referenced submission or student records are later deleted.
 */
@Entity
@Table(name = "grade_audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradeAuditLog extends BaseEntity {

    @Column(name = "submission_id", nullable = false)
    private UUID submissionId;

    @Column(name = "student_id")
    private UUID studentId;

    @Column(name = "exam_template_id")
    private UUID examTemplateId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 30)
    private AuditEventType eventType;

    @Column(name = "original_ai_score", precision = 10, scale = 2)
    private BigDecimal originalAiScore;

    @Column(name = "confidence_level", precision = 5, scale = 2)
    private BigDecimal confidenceLevel;

    @Column(name = "teacher_modified_score", precision = 10, scale = 2)
    private BigDecimal teacherModifiedScore;

    @Column(name = "override_reason", columnDefinition = "TEXT")
    private String overrideReason;

    @Column(name = "reviewer_id")
    private UUID reviewerId;

    @Column(name = "grading_result_grade_id")
    private UUID gradingResultGradeId;
}
