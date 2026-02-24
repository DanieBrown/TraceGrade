package com.tracegrade.examtemplate;

import com.tracegrade.domain.model.DifficultyLevel;
import com.tracegrade.domain.model.ExamTemplate;
import com.tracegrade.domain.repository.ExamTemplateRepository;
import com.tracegrade.dto.request.CreateExamTemplateRequest;
import com.tracegrade.dto.request.UpdateExamTemplateRequest;
import com.tracegrade.dto.response.ExamTemplateResponse;
import com.tracegrade.exception.DuplicateResourceException;
import com.tracegrade.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@SuppressWarnings("null")
class ExamTemplateServiceTest {

    private ExamTemplateRepository examTemplateRepository;
    private ExamTemplateService examTemplateService;

    @BeforeEach
    void setUp() {
        examTemplateRepository = mock(ExamTemplateRepository.class);
        examTemplateService = new ExamTemplateService(examTemplateRepository);
    }

    @Test
    @DisplayName("createExamTemplate should persist and map response")
    void createExamTemplateSuccess() {
        UUID scopedTeacherId = UUID.randomUUID();
        CreateExamTemplateRequest request = CreateExamTemplateRequest.builder()
                .name("Algebra Midterm")
                .subject("Mathematics")
                .topic("Linear Equations")
                .difficultyLevel(DifficultyLevel.MEDIUM)
                .totalPoints(new BigDecimal("100"))
                .questionsJson("[{\"number\":1}]")
                .build();

        ExamTemplate saved = buildTemplate(scopedTeacherId, "Algebra Midterm", "Mathematics", "10th Grade");
        when(examTemplateRepository.existsByTeacherIdAndNameIgnoreCase(scopedTeacherId, "Algebra Midterm")).thenReturn(false);
        when(examTemplateRepository.save(any(ExamTemplate.class))).thenReturn(saved);

        ExamTemplateResponse response = examTemplateService.createExamTemplate(scopedTeacherId, request);

        assertThat(response.getId()).isEqualTo(saved.getId());
        assertThat(response.getTeacherId()).isEqualTo(scopedTeacherId);
        assertThat(response.getName()).isEqualTo("Algebra Midterm");
        assertThat(response.getDifficultyLevel()).isEqualTo(DifficultyLevel.MEDIUM);
        verify(examTemplateRepository).save(argThat(template -> scopedTeacherId.equals(template.getTeacherId())));
    }

    @Test
    @DisplayName("createExamTemplate should throw conflict for duplicate teacher-scoped name")
    void createExamTemplateDuplicateName() {
        UUID scopedTeacherId = UUID.randomUUID();
        CreateExamTemplateRequest request = CreateExamTemplateRequest.builder()
                .name("Algebra Midterm")
                .totalPoints(new BigDecimal("100"))
                .questionsJson("[]")
                .build();

        when(examTemplateRepository.existsByTeacherIdAndNameIgnoreCase(scopedTeacherId, "Algebra Midterm")).thenReturn(true);

        assertThatThrownBy(() -> examTemplateService.createExamTemplate(scopedTeacherId, request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("already exists");

        verify(examTemplateRepository, never()).save(any());
    }

    @Test
    @DisplayName("getExamTemplates should apply teacher, subject and grade filters")
    void getExamTemplatesWithFilters() {
        UUID teacherA = UUID.randomUUID();
        ExamTemplate matching = buildTemplate(teacherA, "Template A", "Mathematics", "10th Grade");

        when(examTemplateRepository.findByTeacherIdAndSubjectIgnoreCaseAndGradeLevelIgnoreCaseOrderByCreatedAtDesc(
            teacherA, "mathematics", "10th Grade")).thenReturn(List.of(matching));

        List<ExamTemplateResponse> results = examTemplateService.getExamTemplates(teacherA, "mathematics", "10th Grade");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getId()).isEqualTo(matching.getId());

        verify(examTemplateRepository)
            .findByTeacherIdAndSubjectIgnoreCaseAndGradeLevelIgnoreCaseOrderByCreatedAtDesc(
                teacherA, "mathematics", "10th Grade");
        }

    @Test
    @DisplayName("getExamTemplateById should throw ResourceNotFoundException when id does not exist")
    void getByIdNotFound() {
        UUID teacherId = UUID.randomUUID();
        UUID id = UUID.randomUUID();
        when(examTemplateRepository.findByIdAndTeacherId(id, teacherId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> examTemplateService.getExamTemplateById(teacherId, id))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("ExamTemplate");
    }

        @Test
        @DisplayName("getExamTemplateById should return not-found for cross-user access")
        void getByIdCrossUserReturnsNotFound() {
            UUID requesterTeacherId = UUID.randomUUID();
            UUID id = UUID.randomUUID();
            when(examTemplateRepository.findByIdAndTeacherId(id, requesterTeacherId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> examTemplateService.getExamTemplateById(requesterTeacherId, id))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("ExamTemplate");
        }

    @Test
    @DisplayName("updateExamTemplate should patch mutable fields")
    void updateExamTemplateSuccess() {
        UUID teacherId = UUID.randomUUID();
        UUID id = UUID.randomUUID();
        ExamTemplate existing = buildTemplate(teacherId, "Old Name", "Math", "9th Grade");
        existing.setId(id);

        UpdateExamTemplateRequest request = UpdateExamTemplateRequest.builder()
                .name("New Name")
                .description("Updated description")
                .difficultyLevel(DifficultyLevel.HARD)
                .totalPoints(new BigDecimal("120"))
                .build();

        when(examTemplateRepository.findByIdAndTeacherId(id, teacherId)).thenReturn(Optional.of(existing));
        when(examTemplateRepository.existsByTeacherIdAndNameIgnoreCase(teacherId, "New Name")).thenReturn(false);
        when(examTemplateRepository.save(existing)).thenReturn(existing);

        ExamTemplateResponse response = examTemplateService.updateExamTemplate(teacherId, id, request);

        assertThat(response.getName()).isEqualTo("New Name");
        assertThat(response.getDescription()).isEqualTo("Updated description");
        assertThat(response.getDifficultyLevel()).isEqualTo(DifficultyLevel.HARD);
        assertThat(response.getTotalPoints()).isEqualByComparingTo("120");
    }

    @Test
    @DisplayName("updateExamTemplate should throw conflict when new name already exists for teacher")
    void updateExamTemplateDuplicateName() {
        UUID teacherId = UUID.randomUUID();
        UUID id = UUID.randomUUID();
        ExamTemplate existing = buildTemplate(teacherId, "Old Name", "Math", "9th Grade");
        existing.setId(id);

        UpdateExamTemplateRequest request = UpdateExamTemplateRequest.builder().name("Duplicate Name").build();

        when(examTemplateRepository.findByIdAndTeacherId(id, teacherId)).thenReturn(Optional.of(existing));
        when(examTemplateRepository.existsByTeacherIdAndNameIgnoreCase(teacherId, "Duplicate Name")).thenReturn(true);

        assertThatThrownBy(() -> examTemplateService.updateExamTemplate(teacherId, id, request))
                .isInstanceOf(DuplicateResourceException.class);

        verify(examTemplateRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateExamTemplate should return not-found for cross-user access")
    void updateExamTemplateCrossUserReturnsNotFound() {
        UUID requesterTeacherId = UUID.randomUUID();
        UUID id = UUID.randomUUID();

        UpdateExamTemplateRequest request = UpdateExamTemplateRequest.builder()
                .name("New Name")
                .build();

        when(examTemplateRepository.findByIdAndTeacherId(id, requesterTeacherId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> examTemplateService.updateExamTemplate(requesterTeacherId, id, request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("ExamTemplate");

        verify(examTemplateRepository, never()).save(any());
    }

    @Test
    @DisplayName("deleteExamTemplate should remove template when found")
    void deleteExamTemplateSuccess() {
        UUID teacherId = UUID.randomUUID();
        UUID id = UUID.randomUUID();
        ExamTemplate existing = buildTemplate(teacherId, "Template", "Math", "9th Grade");
        existing.setId(id);
        when(examTemplateRepository.findByIdAndTeacherId(id, teacherId)).thenReturn(Optional.of(existing));

        examTemplateService.deleteExamTemplate(teacherId, id);

        verify(examTemplateRepository).delete(existing);
    }

    @Test
    @DisplayName("deleteExamTemplate should throw ResourceNotFoundException when missing")
    void deleteExamTemplateMissing() {
        UUID teacherId = UUID.randomUUID();
        UUID id = UUID.randomUUID();
        when(examTemplateRepository.findByIdAndTeacherId(id, teacherId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> examTemplateService.deleteExamTemplate(teacherId, id))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("ExamTemplate");
    }

    @Test
    @DisplayName("deleteExamTemplate should return not-found for cross-user access")
    void deleteExamTemplateCrossUserReturnsNotFound() {
        UUID requesterTeacherId = UUID.randomUUID();
        UUID id = UUID.randomUUID();
        when(examTemplateRepository.findByIdAndTeacherId(id, requesterTeacherId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> examTemplateService.deleteExamTemplate(requesterTeacherId, id))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("ExamTemplate");

        verify(examTemplateRepository, never()).delete(any());
    }

    private ExamTemplate buildTemplate(UUID teacherId, String name, String subject, String gradeLevel) {
        ExamTemplate template = ExamTemplate.builder()
                .teacherId(teacherId)
                .name(name)
                .subject(subject)
                .topic("Topic")
                .description("Description")
                .gradeLevel(gradeLevel)
                .difficultyLevel(DifficultyLevel.MEDIUM)
                .totalPoints(new BigDecimal("100"))
                .questionsJson("[]")
                .build();
        template.setId(UUID.randomUUID());
        return template;
    }
}