package com.tracegrade.domain.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tracegrade.domain.model.AnswerRubric;

public interface AnswerRubricRepository extends JpaRepository<AnswerRubric, UUID> {

    List<AnswerRubric> findByExamTemplateIdOrderByQuestionNumberAsc(UUID examTemplateId);

    Optional<AnswerRubric> findByExamTemplateIdAndQuestionNumber(UUID examTemplateId, Integer questionNumber);
}
