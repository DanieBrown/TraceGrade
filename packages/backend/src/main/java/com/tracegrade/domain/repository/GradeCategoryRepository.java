package com.tracegrade.domain.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.tracegrade.domain.model.GradeCategory;

@Repository
public interface GradeCategoryRepository extends JpaRepository<GradeCategory, UUID> {

    List<GradeCategory> findByClassId(UUID classId);

    boolean existsByClassIdAndNameIgnoreCase(UUID classId, String name);

    boolean existsByClassIdAndNameIgnoreCaseAndIdNot(UUID classId, String name, UUID id);

    @Query("SELECT COALESCE(SUM(gc.weight), 0) FROM GradeCategory gc WHERE gc.classId = :classId")
    BigDecimal sumWeightsByClassId(@Param("classId") UUID classId);

    Optional<GradeCategory> findByIdAndClassId(UUID id, UUID classId);
}
