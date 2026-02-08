package com.tracegrade.domain.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "grading_results")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradingResult extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", nullable = false, unique = true)
    private StudentSubmission submission;

    @Column(name = "grade_id")
    private UUID gradeId;

    @Column(name = "ai_score", precision = 10, scale = 2)
    private BigDecimal aiScore;

    @Column(name = "final_score", precision = 10, scale = 2)
    private BigDecimal finalScore;

    @Column(name = "confidence_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal confidenceScore;

    @Column(name = "needs_review", nullable = false)
    @Builder.Default
    private Boolean needsReview = false;

    @Column(name = "question_scores", nullable = false, columnDefinition = "TEXT")
    private String questionScores;

    @Column(name = "ai_feedback", columnDefinition = "TEXT")
    private String aiFeedback;

    @Column(name = "teacher_override", nullable = false)
    @Builder.Default
    private Boolean teacherOverride = false;

    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "processing_time_ms")
    private Integer processingTimeMs;
}
