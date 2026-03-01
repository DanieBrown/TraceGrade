package com.tracegrade.auditlog;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.tracegrade.domain.model.GradingResult;
import com.tracegrade.domain.model.StudentSubmission;
import com.tracegrade.dto.response.GradeAuditLogResponse;

/**
 * Service contract for recording AI grading audit events and querying the audit log.
 *
 * <p>All write methods run in a dedicated {@code REQUIRES_NEW} transaction so that
 * audit-write failures never taint the outer grading pipeline transaction.
 * Each write method swallows exceptions internally — callers are guaranteed not to
 * receive a propagated exception from these methods.
 */
public interface AuditLogService {

    /**
     * Record a successful AI grading event.
     *
     * @param result the completed grading result (must not be null)
     */
    void logAiGradingSuccess(GradingResult result);

    /**
     * Record a failed AI grading event.
     *
     * @param submission the submission that could not be graded (must not be null)
     */
    void logAiGradingFailure(StudentSubmission submission);

    /**
     * Record a teacher override event.
     *
     * @param result             the updated grading result (after mutation; must not be null)
     * @param previousFinalScore the final score that existed before the teacher override
     * @param overrideReason     free-text reason supplied by the teacher; may be null
     */
    void logTeacherOverride(GradingResult result, BigDecimal previousFinalScore, String overrideReason);

    /**
     * Query audit log entries with optional filters.
     *
     * <p>All parameters are nullable. When all are null every record is returned.
     * When {@code from} and {@code to} are both non-null the caller is responsible
     * for ensuring {@code from} is before {@code to} (the controller performs this
     * validation before delegating here).
     *
     * @param studentId optional student UUID filter
     * @param from      optional lower bound (inclusive) on {@code createdAt}
     * @param to        optional upper bound (inclusive) on {@code createdAt}
     * @return list of matching audit log entries mapped to response DTOs; never null
     */
    List<GradeAuditLogResponse> queryAuditLogs(UUID studentId, Instant from, Instant to);
}
