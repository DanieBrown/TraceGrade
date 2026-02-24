package com.tracegrade.examtemplate;

import com.tracegrade.domain.model.ExamTemplate;
import com.tracegrade.domain.repository.ExamTemplateRepository;
import com.tracegrade.dto.request.CreateExamTemplateRequest;
import com.tracegrade.dto.request.UpdateExamTemplateRequest;
import com.tracegrade.dto.response.ExamTemplateResponse;
import com.tracegrade.exception.DuplicateResourceException;
import com.tracegrade.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class ExamTemplateService {

    private final ExamTemplateRepository examTemplateRepository;

    @Transactional
    public ExamTemplateResponse createExamTemplate(UUID teacherId, CreateExamTemplateRequest request) {
        if (examTemplateRepository.existsByTeacherIdAndNameIgnoreCase(teacherId, request.getName())) {
            throw new DuplicateResourceException("ExamTemplate", "name", request.getName());
        }

        ExamTemplate examTemplate = ExamTemplate.builder()
                .teacherId(teacherId)
                .assignmentId(request.getAssignmentId())
                .name(request.getName())
                .subject(request.getSubject())
                .topic(request.getTopic())
                .description(request.getDescription())
                .gradeLevel(request.getGradeLevel())
                .difficultyLevel(request.getDifficultyLevel())
                .totalPoints(request.getTotalPoints())
                .questionsJson(request.getQuestionsJson())
                .build();

        log.info("Creating exam template: teacherId={}, name={}", teacherId, request.getName());
        return toResponse(examTemplateRepository.save(examTemplate));
    }

    @Transactional(readOnly = true)
    public List<ExamTemplateResponse> getExamTemplates(UUID teacherId, String subject, String gradeLevel) {

        String normalizedSubject = normalize(subject);
        String normalizedGradeLevel = normalize(gradeLevel);
        List<ExamTemplate> templates;

        if (normalizedSubject != null && normalizedGradeLevel != null) {
            templates = examTemplateRepository
                    .findByTeacherIdAndSubjectIgnoreCaseAndGradeLevelIgnoreCaseOrderByCreatedAtDesc(
                            teacherId, normalizedSubject, normalizedGradeLevel);
        } else if (normalizedSubject != null) {
            templates = examTemplateRepository
                    .findByTeacherIdAndSubjectIgnoreCaseOrderByCreatedAtDesc(teacherId, normalizedSubject);
        } else if (normalizedGradeLevel != null) {
            templates = examTemplateRepository
                    .findByTeacherIdAndGradeLevelIgnoreCaseOrderByCreatedAtDesc(teacherId, normalizedGradeLevel);
        } else {
            templates = examTemplateRepository.findByTeacherIdOrderByCreatedAtDesc(teacherId);
        }

        return templates.stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ExamTemplateResponse getExamTemplateById(UUID teacherId, UUID id) {
        return toResponse(findByIdForTeacher(teacherId, id));
    }

    @Transactional
    public ExamTemplateResponse updateExamTemplate(UUID teacherId, UUID id, UpdateExamTemplateRequest request) {
        ExamTemplate examTemplate = findByIdForTeacher(teacherId, id);

        if (request.getName() != null && !request.getName().equalsIgnoreCase(examTemplate.getName())
                && examTemplateRepository.existsByTeacherIdAndNameIgnoreCase(examTemplate.getTeacherId(), request.getName())) {
            throw new DuplicateResourceException("ExamTemplate", "name", request.getName());
        }

        if (request.getName() != null) examTemplate.setName(request.getName());
        if (request.getSubject() != null) examTemplate.setSubject(request.getSubject());
        if (request.getTopic() != null) examTemplate.setTopic(request.getTopic());
        if (request.getDescription() != null) examTemplate.setDescription(request.getDescription());
        if (request.getGradeLevel() != null) examTemplate.setGradeLevel(request.getGradeLevel());
        if (request.getDifficultyLevel() != null) examTemplate.setDifficultyLevel(request.getDifficultyLevel());
        if (request.getTotalPoints() != null) examTemplate.setTotalPoints(request.getTotalPoints());
        if (request.getQuestionsJson() != null) examTemplate.setQuestionsJson(request.getQuestionsJson());

        log.info("Updating exam template: id={}", id);
        return toResponse(examTemplateRepository.save(examTemplate));
    }

    @Transactional
    public void deleteExamTemplate(UUID teacherId, UUID id) {
        ExamTemplate examTemplate = findByIdForTeacher(teacherId, id);
        log.info("Deleting exam template: id={}", id);
        examTemplateRepository.delete(examTemplate);
    }

    private ExamTemplate findByIdForTeacher(UUID teacherId, UUID id) {
        return examTemplateRepository.findByIdAndTeacherId(id, teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("ExamTemplate", id));
    }

    private ExamTemplateResponse toResponse(ExamTemplate examTemplate) {
        return ExamTemplateResponse.builder()
                .id(examTemplate.getId())
                .teacherId(examTemplate.getTeacherId())
                .assignmentId(examTemplate.getAssignmentId())
                .name(examTemplate.getName())
                .subject(examTemplate.getSubject())
                .topic(examTemplate.getTopic())
                .description(examTemplate.getDescription())
                .gradeLevel(examTemplate.getGradeLevel())
                .difficultyLevel(examTemplate.getDifficultyLevel())
                .totalPoints(examTemplate.getTotalPoints())
                .questionsJson(examTemplate.getQuestionsJson())
                .pdfUrl(examTemplate.getPdfUrl())
                .generationPrompt(examTemplate.getGenerationPrompt())
                .createdAt(examTemplate.getCreatedAt())
                .updatedAt(examTemplate.getUpdatedAt())
                .build();
    }

    private static String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

}