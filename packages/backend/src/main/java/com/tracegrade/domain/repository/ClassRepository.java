package com.tracegrade.domain.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tracegrade.domain.model.Class;

@Repository
public interface ClassRepository extends JpaRepository<Class, UUID> {

    List<Class> findBySchoolIdAndIsActiveTrue(UUID schoolId);

    List<Class> findBySchoolId(UUID schoolId);

    Optional<Class> findByIdAndSchoolId(UUID classId, UUID schoolId);

    boolean existsBySchoolIdAndTeacherIdAndNameIgnoreCaseAndSchoolYearAndPeriodAndIsActiveTrue(
            UUID schoolId,
            UUID teacherId,
            String name,
            String schoolYear,
            String period);

    boolean existsBySchoolIdAndTeacherIdAndNameIgnoreCaseAndSchoolYearAndPeriodAndIsActiveTrueAndIdNot(
            UUID schoolId,
            UUID teacherId,
            String name,
            String schoolYear,
            String period,
            UUID id);
}