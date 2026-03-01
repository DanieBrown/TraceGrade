package com.tracegrade.domain.repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tracegrade.domain.model.GradeAuditLog;

public interface GradeAuditLogRepository extends JpaRepository<GradeAuditLog, UUID> {

    List<GradeAuditLog> findByStudentId(UUID studentId);

    List<GradeAuditLog> findByCreatedAtBetween(Instant from, Instant to);

    List<GradeAuditLog> findByStudentIdAndCreatedAtBetween(UUID studentId, Instant from, Instant to);
}
