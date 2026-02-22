package com.tracegrade.domain.repository;

import com.tracegrade.domain.model.School;
import com.tracegrade.domain.model.SchoolType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SchoolRepository extends JpaRepository<School, UUID> {

    List<School> findByIsActiveTrue();

    List<School> findBySchoolTypeAndIsActiveTrue(SchoolType schoolType);

    boolean existsByNameIgnoreCase(String name);
}
