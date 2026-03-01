package com.tracegrade.domain.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tracegrade.domain.model.Grade;

@Repository
public interface GradeRepository extends JpaRepository<Grade, UUID> {

    List<Grade> findByAssignmentId(UUID assignmentId);

    Optional<Grade> findByIdAndAssignmentId(UUID id, UUID assignmentId);

    boolean existsByStudentIdAndAssignmentId(UUID studentId, UUID assignmentId);
}
