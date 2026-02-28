package com.tracegrade.domain.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tracegrade.domain.model.ClassEnrollment;

@Repository
public interface ClassEnrollmentRepository extends JpaRepository<ClassEnrollment, UUID> {

    List<ClassEnrollment> findByClassIdAndDroppedAtIsNull(UUID classId);

    List<ClassEnrollment> findByClassId(UUID classId);

    List<ClassEnrollment> findByStudentId(UUID studentId);

    boolean existsByClassIdAndStudentIdAndDroppedAtIsNull(UUID classId, UUID studentId);

    Optional<ClassEnrollment> findByClassIdAndStudentIdAndDroppedAtIsNull(UUID classId, UUID studentId);

    Optional<ClassEnrollment> findByIdAndClassId(UUID enrollmentId, UUID classId);
}
