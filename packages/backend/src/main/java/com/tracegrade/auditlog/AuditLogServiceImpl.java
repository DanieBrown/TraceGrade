package com.tracegrade.auditlog;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.tracegrade.domain.model.AuditEventType;
import com.tracegrade.domain.model.GradeAuditLog;
import com.tracegrade.domain.model.GradingResult;
import com.tracegrade.domain.model.StudentSubmission;
import com.tracegrade.domain.repository.GradeAuditLogRepository;
import com.tracegrade.dto.response.GradeAuditLogResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Default implementation of {@link AuditLogService}.
 *
 * <p>Each write method runs in a separate {@code REQUIRES_NEW} transaction so that a
 * DB failure during an audit write is isolated from the caller's outer transaction.
 * All write methods catch every exception, emit a WARN log, and swallow the error —
 * the grading pipeline must never be blocked by an audit-log failure.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private final GradeAuditLogRepository gradeAuditLogRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // Write methods — each runs in its own REQUIRES_NEW transaction
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * {@inheritDoc}
     *
     * <p>Stores an {@code AI_GRADING_SUCCESS} record.  {@code originalAiScore} is
     * taken from {@code result.getAiScore()} and {@code confidenceLevel} from
     * {@code result.getConfidenceScore()}.  {@code teacherModifiedScore},
     * {@code overrideReason}, and {@code reviewerId} are left null.
     */
    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAiGradingSuccess(GradingResult result) {
        try {
            StudentSubmission submission = result.getSubmission();
            UUID studentId = resolveStudentId(submission);
            UUID examTemplateId = resolveExamTemplateId(submission);

            GradeAuditLog auditLog = GradeAuditLog.builder()
                    .submissionId(submission.getId())
                    .studentId(studentId)
                    .examTemplateId(examTemplateId)
                    .eventType(AuditEventType.AI_GRADING_SUCCESS)
                    .originalAiScore(result.getAiScore())
                    .confidenceLevel(result.getConfidenceScore())
                    .teacherModifiedScore(null)
                    .overrideReason(null)
                    .reviewerId(null)
                    .gradingResultGradeId(result.getGradeId())
                    .build();

            gradeAuditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.warn("Failed to write audit log for eventType={} submissionId={}",
                    AuditEventType.AI_GRADING_SUCCESS,
                    result.getSubmission() != null ? result.getSubmission().getId() : "null",
                    e);
        }
    }

    /**
     * {@inheritDoc}
     *
     * <p>Stores an {@code AI_GRADING_FAILURE} record.  Per EC-7, {@code originalAiScore}
     * is stored as {@code BigDecimal.ZERO} when the grading pipeline did not produce a
     * score.
     */
    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAiGradingFailure(StudentSubmission submission) {
        try {
            UUID studentId = resolveStudentId(submission);
            UUID examTemplateId = resolveExamTemplateId(submission);

            GradeAuditLog auditLog = GradeAuditLog.builder()
                    .submissionId(submission.getId())
                    .studentId(studentId)
                    .examTemplateId(examTemplateId)
                    .eventType(AuditEventType.AI_GRADING_FAILURE)
                    .originalAiScore(BigDecimal.ZERO)   // EC-7: no score available on failure
                    .confidenceLevel(null)
                    .teacherModifiedScore(null)
                    .overrideReason(null)
                    .reviewerId(null)
                    .gradingResultGradeId(null)
                    .build();

            gradeAuditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.warn("Failed to write audit log for eventType={} submissionId={}",
                    AuditEventType.AI_GRADING_FAILURE,
                    submission.getId(),
                    e);
        }
    }

    /**
     * {@inheritDoc}
     *
     * <p>Stores a {@code TEACHER_OVERRIDE} record.  {@code originalAiScore} reflects
     * the immutable AI-assigned score; {@code teacherModifiedScore} is the new final
     * score after the teacher's mutation.  {@code previousFinalScore} is not stored
     * directly — the pre-override value is available from the prior
     * {@code AI_GRADING_SUCCESS} record.
     */
    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logTeacherOverride(GradingResult result, BigDecimal previousFinalScore, String overrideReason) {
        try {
            StudentSubmission submission = result.getSubmission();
            UUID studentId = resolveStudentId(submission);
            UUID examTemplateId = resolveExamTemplateId(submission);

            GradeAuditLog auditLog = GradeAuditLog.builder()
                    .submissionId(submission.getId())
                    .studentId(studentId)
                    .examTemplateId(examTemplateId)
                    .eventType(AuditEventType.TEACHER_OVERRIDE)
                    .originalAiScore(result.getAiScore())
                    .confidenceLevel(result.getConfidenceScore())
                    .teacherModifiedScore(result.getFinalScore())
                    .overrideReason(overrideReason)
                    .reviewerId(result.getReviewedBy())
                    .gradingResultGradeId(result.getGradeId())
                    .build();

            gradeAuditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.warn("Failed to write audit log for eventType={} submissionId={}",
                    AuditEventType.TEACHER_OVERRIDE,
                    result.getSubmission() != null ? result.getSubmission().getId() : "null",
                    e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Query method — read-only, dispatches based on which params are non-null
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * {@inheritDoc}
     *
     * <p>Dispatch rules (checked in this order):
     * <ol>
     *   <li>{@code studentId} non-null AND {@code from}/{@code to} non-null →
     *       {@code findByStudentIdAndCreatedAtBetween}</li>
     *   <li>{@code studentId} non-null only → {@code findByStudentId}</li>
     *   <li>{@code from}/{@code to} non-null only → {@code findByCreatedAtBetween}</li>
     *   <li>All null → {@code findAll()} (EC-4: return everything)</li>
     * </ol>
     */
    @Override
    @Transactional(readOnly = true)
    public List<GradeAuditLogResponse> queryAuditLogs(UUID studentId, Instant from, Instant to) {
        List<GradeAuditLog> results;

        if (studentId != null && from != null && to != null) {
            results = gradeAuditLogRepository.findByStudentIdAndCreatedAtBetween(studentId, from, to);
        } else if (studentId != null) {
            results = gradeAuditLogRepository.findByStudentId(studentId);
        } else if (from != null && to != null) {
            results = gradeAuditLogRepository.findByCreatedAtBetween(from, to);
        } else {
            results = gradeAuditLogRepository.findAll();
        }

        return results.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Derives the student UUID from a submission.
     *
     * <p>Per EC-8, {@code studentId} may be null on the submission if the association
     * was not populated.  In that case we log a WARN and return null — the audit record
     * is still written so no event is silently dropped.
     */
    private UUID resolveStudentId(StudentSubmission submission) {
        UUID studentId = submission.getStudentId();
        if (studentId == null) {
            log.warn("Audit log: studentId is null on submissionId={}; storing null in audit record",
                    submission.getId());
        }
        return studentId;
    }

    /**
     * Derives the exam-template UUID from a submission.
     *
     * <p>Per EC-9, {@code examTemplate} may be null (the submission has no exam template).
     * We return null in that case without throwing.
     */
    private UUID resolveExamTemplateId(StudentSubmission submission) {
        if (submission.getExamTemplate() == null) {
            return null;
        }
        return submission.getExamTemplate().getId();
    }

    /**
     * Maps a {@link GradeAuditLog} entity to its response DTO.
     */
    private GradeAuditLogResponse toResponse(GradeAuditLog log) {
        return GradeAuditLogResponse.builder()
                .id(log.getId())
                .submissionId(log.getSubmissionId())
                .studentId(log.getStudentId())
                .examTemplateId(log.getExamTemplateId())
                .eventType(log.getEventType())
                .originalAiScore(log.getOriginalAiScore())
                .confidenceLevel(log.getConfidenceLevel())
                .teacherModifiedScore(log.getTeacherModifiedScore())
                .overrideReason(log.getOverrideReason())
                .reviewerId(log.getReviewerId())
                .gradingResultGradeId(log.getGradingResultGradeId())
                .createdAt(log.getCreatedAt())
                .updatedAt(log.getUpdatedAt())
                .build();
    }
}
