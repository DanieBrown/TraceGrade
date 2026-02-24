package com.tracegrade.domain.repository;

import com.tracegrade.domain.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentRepository extends JpaRepository<Student, UUID> {

    List<Student> findBySchoolIdAndIsActiveTrue(UUID schoolId);

    List<Student> findBySchoolId(UUID schoolId);

    Optional<Student> findByIdAndSchoolId(UUID id, UUID schoolId);

    boolean existsByEmailAndSchoolId(String email, UUID schoolId);

    boolean existsByStudentNumberAndSchoolId(String studentNumber, UUID schoolId);
}
