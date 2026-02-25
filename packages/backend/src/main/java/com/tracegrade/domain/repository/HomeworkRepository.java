package com.tracegrade.domain.repository;

import com.tracegrade.domain.model.Homework;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface HomeworkRepository extends JpaRepository<Homework, UUID> {

    List<Homework> findBySchoolIdOrderByCreatedAtDesc(UUID schoolId);

    Optional<Homework> findByIdAndSchoolId(UUID id, UUID schoolId);

    boolean existsByTitleAndSchoolId(String title, UUID schoolId);
}
