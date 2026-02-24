package com.tracegrade.domain.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tracegrade.domain.model.ExamTemplate;

public interface ExamTemplateRepository extends JpaRepository<ExamTemplate, UUID> {

    boolean existsByTeacherIdAndNameIgnoreCase(UUID teacherId, String name);

    List<ExamTemplate> findByTeacherIdOrderByCreatedAtDesc(UUID teacherId);

    List<ExamTemplate> findByTeacherIdAndSubjectIgnoreCaseOrderByCreatedAtDesc(UUID teacherId, String subject);

    List<ExamTemplate> findByTeacherIdAndSubject(UUID teacherId, String subject);

    List<ExamTemplate> findByTeacherIdAndGradeLevelIgnoreCaseOrderByCreatedAtDesc(UUID teacherId, String gradeLevel);

    List<ExamTemplate> findByGradeLevel(String gradeLevel);

    List<ExamTemplate> findByTeacherIdAndSubjectIgnoreCaseAndGradeLevelIgnoreCaseOrderByCreatedAtDesc(
            UUID teacherId,
            String subject,
            String gradeLevel);

    List<ExamTemplate> findBySubjectAndGradeLevel(String subject, String gradeLevel);

    Optional<ExamTemplate> findByIdAndTeacherId(UUID id, UUID teacherId);
}
