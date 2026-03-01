package com.tracegrade.domain.model;

/**
 * Represents the type of audit event recorded in the grade audit log.
 */
public enum AuditEventType {
    AI_GRADING_SUCCESS,
    AI_GRADING_FAILURE,
    TEACHER_OVERRIDE
}
