package com.tracegrade.rubric;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tracegrade.domain.model.AnswerRubric;
import com.tracegrade.domain.model.ExamTemplate;
import com.tracegrade.domain.repository.AnswerRubricRepository;
import com.tracegrade.domain.repository.ExamTemplateRepository;
import com.tracegrade.dto.request.CreateAnswerRubricRequest;
import com.tracegrade.dto.request.UpdateAnswerRubricRequest;
import com.tracegrade.dto.response.AnswerRubricResponse;
import com.tracegrade.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@SuppressWarnings("null") // Spring Data @NonNull vs Lombok-generated method signatures
public class AnswerRubricService {

    private final AnswerRubricRepository rubricRepository;
    private final ExamTemplateRepository examTemplateRepository;

    @Transactional
    public AnswerRubricResponse create(UUID examTemplateId, CreateAnswerRubricRequest request) {
        ExamTemplate examTemplate = examTemplateRepository.findById(examTemplateId)
                .orElseThrow(() -> new ResourceNotFoundException("ExamTemplate", examTemplateId));

        rubricRepository.findByExamTemplateIdAndQuestionNumber(examTemplateId, request.getQuestionNumber())
                .ifPresent(existing -> {
                    throw new DuplicateQuestionNumberException(examTemplateId, request.getQuestionNumber());
                });

        AnswerRubric rubric = AnswerRubric.builder()
                .examTemplate(examTemplate)
                .questionNumber(request.getQuestionNumber())
                .answerText(request.getAnswerText())
                .answerImageUrl(request.getAnswerImageUrl())
                .pointsAvailable(request.getPointsAvailable())
                .acceptableVariations(request.getAcceptableVariations())
                .gradingNotes(request.getGradingNotes())
                .build();

        AnswerRubric saved = rubricRepository.save(rubric);
        log.info("AnswerRubric created id={} examTemplateId={} questionNumber={}",
                saved.getId(), examTemplateId, saved.getQuestionNumber());
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AnswerRubricResponse> listByExamTemplate(UUID examTemplateId) {
        if (!examTemplateRepository.existsById(examTemplateId)) {
            throw new ResourceNotFoundException("ExamTemplate", examTemplateId);
        }
        return rubricRepository.findByExamTemplateIdOrderByQuestionNumberAsc(examTemplateId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AnswerRubricResponse getById(UUID examTemplateId, UUID rubricId) {
        if (!examTemplateRepository.existsById(examTemplateId)) {
            throw new ResourceNotFoundException("ExamTemplate", examTemplateId);
        }
        AnswerRubric rubric = rubricRepository.findById(rubricId)
                .filter(r -> r.getExamTemplate().getId().equals(examTemplateId))
                .orElseThrow(() -> new ResourceNotFoundException("AnswerRubric", rubricId));
        return toResponse(rubric);
    }

    @Transactional
    public AnswerRubricResponse update(UUID examTemplateId, UUID rubricId, UpdateAnswerRubricRequest request) {
        if (!examTemplateRepository.existsById(examTemplateId)) {
            throw new ResourceNotFoundException("ExamTemplate", examTemplateId);
        }
        AnswerRubric rubric = rubricRepository.findById(rubricId)
                .filter(r -> r.getExamTemplate().getId().equals(examTemplateId))
                .orElseThrow(() -> new ResourceNotFoundException("AnswerRubric", rubricId));

        if (request.getQuestionNumber() != null
                && !request.getQuestionNumber().equals(rubric.getQuestionNumber())) {
            rubricRepository.findByExamTemplateIdAndQuestionNumber(examTemplateId, request.getQuestionNumber())
                    .ifPresent(existing -> {
                        throw new DuplicateQuestionNumberException(examTemplateId, request.getQuestionNumber());
                    });
            rubric.setQuestionNumber(request.getQuestionNumber());
        }
        if (request.getAnswerText() != null)           rubric.setAnswerText(request.getAnswerText());
        if (request.getAnswerImageUrl() != null)       rubric.setAnswerImageUrl(request.getAnswerImageUrl());
        if (request.getPointsAvailable() != null)      rubric.setPointsAvailable(request.getPointsAvailable());
        if (request.getAcceptableVariations() != null) rubric.setAcceptableVariations(request.getAcceptableVariations());
        if (request.getGradingNotes() != null)         rubric.setGradingNotes(request.getGradingNotes());

        AnswerRubric saved = rubricRepository.save(rubric);
        log.info("AnswerRubric updated id={} examTemplateId={}", rubricId, examTemplateId);
        return toResponse(saved);
    }

    @Transactional
    public void delete(UUID examTemplateId, UUID rubricId) {
        if (!examTemplateRepository.existsById(examTemplateId)) {
            throw new ResourceNotFoundException("ExamTemplate", examTemplateId);
        }
        AnswerRubric rubric = rubricRepository.findById(rubricId)
                .filter(r -> r.getExamTemplate().getId().equals(examTemplateId))
                .orElseThrow(() -> new ResourceNotFoundException("AnswerRubric", rubricId));
        rubricRepository.delete(rubric);
        log.info("AnswerRubric deleted id={} examTemplateId={}", rubricId, examTemplateId);
    }

    private AnswerRubricResponse toResponse(AnswerRubric rubric) {
        return AnswerRubricResponse.builder()
                .id(rubric.getId())
                .examTemplateId(rubric.getExamTemplate().getId())
                .questionNumber(rubric.getQuestionNumber())
                .answerText(rubric.getAnswerText())
                .answerImageUrl(rubric.getAnswerImageUrl())
                .pointsAvailable(rubric.getPointsAvailable())
                .acceptableVariations(rubric.getAcceptableVariations())
                .gradingNotes(rubric.getGradingNotes())
                .createdAt(rubric.getCreatedAt())
                .updatedAt(rubric.getUpdatedAt())
                .build();
    }
}
