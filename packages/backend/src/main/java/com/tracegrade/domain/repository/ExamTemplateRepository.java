package com.tracegrade.domain.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tracegrade.domain.model.ExamTemplate;

public interface ExamTemplateRepository extends JpaRepository<ExamTemplate, UUID> {

    List<ExamTemplate> findByTeacherIdOrderByCreatedAtDesc(UUID teacherId);

    List<ExamTemplate> findByTeacherIdAndSubject(UUID teacherId, String subject);
}
