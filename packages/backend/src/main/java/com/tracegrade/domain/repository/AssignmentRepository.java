package com.tracegrade.domain.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tracegrade.domain.model.Assignment;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, UUID> {

    List<Assignment> findByClassId(UUID classId);

    List<Assignment> findByClassIdAndIsPublished(UUID classId, boolean isPublished);

    Optional<Assignment> findByIdAndClassId(UUID id, UUID classId);

    boolean existsByClassIdAndNameIgnoreCase(UUID classId, String name);

    boolean existsByClassIdAndNameIgnoreCaseAndIdNot(UUID classId, String name, UUID id);
}
