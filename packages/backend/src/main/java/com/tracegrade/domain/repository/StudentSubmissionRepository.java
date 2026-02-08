package com.tracegrade.domain.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tracegrade.domain.model.StudentSubmission;
import com.tracegrade.domain.model.SubmissionStatus;

public interface StudentSubmissionRepository extends JpaRepository<StudentSubmission, UUID> {

    List<StudentSubmission> findByAssignmentIdAndStudentId(UUID assignmentId, UUID studentId);

    List<StudentSubmission> findByStudentIdOrderByCreatedAtDesc(UUID studentId);

    List<StudentSubmission> findByStatus(SubmissionStatus status);

    List<StudentSubmission> findByAssignmentId(UUID assignmentId);
}
