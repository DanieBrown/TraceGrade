package com.tracegrade.rubric;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import com.tracegrade.domain.model.AnswerRubric;
import com.tracegrade.domain.model.ExamTemplate;
import com.tracegrade.domain.repository.AnswerRubricRepository;
import com.tracegrade.domain.repository.ExamTemplateRepository;
import com.tracegrade.dto.request.CreateAnswerRubricRequest;
import com.tracegrade.dto.request.UpdateAnswerRubricRequest;
import com.tracegrade.dto.response.AnswerRubricResponse;
import com.tracegrade.exception.ResourceNotFoundException;

@SuppressWarnings("null") // Mockito thenReturn vs @NonNull JpaRepository.save() return type
class AnswerRubricServiceTest {

    private AnswerRubricRepository rubricRepository;
    private ExamTemplateRepository examTemplateRepository;
    private AnswerRubricService service;

    private static final UUID TEMPLATE_ID = UUID.randomUUID();
    private static final UUID RUBRIC_ID = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        rubricRepository = mock(AnswerRubricRepository.class);
        examTemplateRepository = mock(ExamTemplateRepository.class);
        service = new AnswerRubricService(rubricRepository, examTemplateRepository);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private ExamTemplate buildTemplate() {
        ExamTemplate template = new ExamTemplate();
        template.setId(TEMPLATE_ID);
        return template;
    }

    private AnswerRubric buildRubric(ExamTemplate template, int questionNumber) {
        AnswerRubric rubric = AnswerRubric.builder()
                .examTemplate(template)
                .questionNumber(questionNumber)
                .answerText("Answer " + questionNumber)
                .pointsAvailable(new BigDecimal("5.00"))
                .build();
        rubric.setId(RUBRIC_ID);
        rubric.setCreatedAt(Instant.now());
        rubric.setUpdatedAt(Instant.now());
        return rubric;
    }

    private CreateAnswerRubricRequest createRequest(int questionNumber) {
        return CreateAnswerRubricRequest.builder()
                .questionNumber(questionNumber)
                .answerText("The answer")
                .pointsAvailable(new BigDecimal("5.00"))
                .gradingNotes("Some notes")
                .build();
    }

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Create rubric")
    class CreateTests {

        @Test
        @DisplayName("Should create and return rubric when template exists and question number is free")
        void createSuccess() {
            ExamTemplate template = buildTemplate();
            when(examTemplateRepository.findById(TEMPLATE_ID)).thenReturn(Optional.of(template));
            when(rubricRepository.findByExamTemplateIdAndQuestionNumber(TEMPLATE_ID, 1))
                    .thenReturn(Optional.empty());

            AnswerRubric saved = buildRubric(template, 1);
            when(rubricRepository.save(any(AnswerRubric.class))).thenReturn(saved);

            AnswerRubricResponse response = service.create(TEMPLATE_ID, createRequest(1));

            assertThat(response.getId()).isEqualTo(RUBRIC_ID);
            assertThat(response.getExamTemplateId()).isEqualTo(TEMPLATE_ID);
            assertThat(response.getQuestionNumber()).isEqualTo(1);
            assertThat(response.getPointsAvailable()).isEqualByComparingTo(new BigDecimal("5.00"));
            verify(rubricRepository).save(any(AnswerRubric.class));
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when template does not exist")
        void createThrowsWhenTemplateNotFound() {
            when(examTemplateRepository.findById(TEMPLATE_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.create(TEMPLATE_ID, createRequest(1)))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("ExamTemplate");

            verify(rubricRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw DuplicateQuestionNumberException when question number already exists")
        void createThrowsOnDuplicateQuestionNumber() {
            ExamTemplate template = buildTemplate();
            when(examTemplateRepository.findById(TEMPLATE_ID)).thenReturn(Optional.of(template));
            when(rubricRepository.findByExamTemplateIdAndQuestionNumber(TEMPLATE_ID, 1))
                    .thenReturn(Optional.of(buildRubric(template, 1)));

            assertThatThrownBy(() -> service.create(TEMPLATE_ID, createRequest(1)))
                    .isInstanceOf(DuplicateQuestionNumberException.class)
                    .hasMessageContaining("1");
        }

        @Test
        @DisplayName("Should not call save when duplicate question number is detected")
        void createDoesNotSaveOnDuplicate() {
            ExamTemplate template = buildTemplate();
            when(examTemplateRepository.findById(TEMPLATE_ID)).thenReturn(Optional.of(template));
            when(rubricRepository.findByExamTemplateIdAndQuestionNumber(TEMPLATE_ID, 1))
                    .thenReturn(Optional.of(buildRubric(template, 1)));

            assertThatThrownBy(() -> service.create(TEMPLATE_ID, createRequest(1)))
                    .isInstanceOf(DuplicateQuestionNumberException.class);

            verify(rubricRepository, never()).save(any());
        }
    }

    // -------------------------------------------------------------------------
    // List
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("List rubrics by exam template")
    class ListTests {

        @Test
        @DisplayName("Should return rubrics ordered by question number")
        void listReturnsOrdered() {
            ExamTemplate template = buildTemplate();
            when(examTemplateRepository.existsById(TEMPLATE_ID)).thenReturn(true);

            AnswerRubric r1 = buildRubric(template, 1);
            AnswerRubric r2 = buildRubric(template, 2);
            AnswerRubric r3 = buildRubric(template, 3);
            when(rubricRepository.findByExamTemplateIdOrderByQuestionNumberAsc(TEMPLATE_ID))
                    .thenReturn(List.of(r1, r2, r3));

            List<AnswerRubricResponse> results = service.listByExamTemplate(TEMPLATE_ID);

            assertThat(results).hasSize(3);
            assertThat(results.get(0).getQuestionNumber()).isEqualTo(1);
            assertThat(results.get(1).getQuestionNumber()).isEqualTo(2);
            assertThat(results.get(2).getQuestionNumber()).isEqualTo(3);
        }

        @Test
        @DisplayName("Should return empty list when template has no rubrics")
        void listReturnsEmptyList() {
            when(examTemplateRepository.existsById(TEMPLATE_ID)).thenReturn(true);
            when(rubricRepository.findByExamTemplateIdOrderByQuestionNumberAsc(TEMPLATE_ID))
                    .thenReturn(List.of());

            List<AnswerRubricResponse> results = service.listByExamTemplate(TEMPLATE_ID);

            assertThat(results).isEmpty();
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when template does not exist")
        void listThrowsWhenTemplateNotFound() {
            when(examTemplateRepository.existsById(TEMPLATE_ID)).thenReturn(false);

            assertThatThrownBy(() -> service.listByExamTemplate(TEMPLATE_ID))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("ExamTemplate");
        }
    }

    // -------------------------------------------------------------------------
    // Get by ID
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Get rubric by ID")
    class GetByIdTests {

        @Test
        @DisplayName("Should return rubric when it exists and belongs to the template")
        void getByIdSuccess() {
            ExamTemplate template = buildTemplate();
            AnswerRubric rubric = buildRubric(template, 1);

            when(examTemplateRepository.existsById(TEMPLATE_ID)).thenReturn(true);
            when(rubricRepository.findById(RUBRIC_ID)).thenReturn(Optional.of(rubric));

            AnswerRubricResponse response = service.getById(TEMPLATE_ID, RUBRIC_ID);

            assertThat(response.getId()).isEqualTo(RUBRIC_ID);
            assertThat(response.getExamTemplateId()).isEqualTo(TEMPLATE_ID);
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when template does not exist")
        void getByIdThrowsWhenTemplateNotFound() {
            when(examTemplateRepository.existsById(TEMPLATE_ID)).thenReturn(false);

            assertThatThrownBy(() -> service.getById(TEMPLATE_ID, RUBRIC_ID))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("ExamTemplate");
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when rubric does not exist")
        void getByIdThrowsWhenRubricNotFound() {
            when(examTemplateRepository.existsById(TEMPLATE_ID)).thenReturn(true);
            when(rubricRepository.findById(RUBRIC_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.getById(TEMPLATE_ID, RUBRIC_ID))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("AnswerRubric");
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when rubric belongs to a different template")
        void getByIdThrowsWhenRubricBelongsToDifferentTemplate() {
            ExamTemplate otherTemplate = new ExamTemplate();
            otherTemplate.setId(UUID.randomUUID());
            AnswerRubric rubric = buildRubric(otherTemplate, 1);

            when(examTemplateRepository.existsById(TEMPLATE_ID)).thenReturn(true);
            when(rubricRepository.findById(RUBRIC_ID)).thenReturn(Optional.of(rubric));

            assertThatThrownBy(() -> service.getById(TEMPLATE_ID, RUBRIC_ID))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("AnswerRubric");
        }
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Update rubric")
    class UpdateTests {

        @Test
        @DisplayName("Should apply all non-null fields and return updated rubric")
        void updateSuccess() {
            ExamTemplate template = buildTemplate();
            AnswerRubric rubric = buildRubric(template, 1);

            when(examTemplateRepository.existsById(TEMPLATE_ID)).thenReturn(true);
            when(rubricRepository.findById(RUBRIC_ID)).thenReturn(Optional.of(rubric));
            when(rubricRepository.findByExamTemplateIdAndQuestionNumber(TEMPLATE_ID, 2))
                    .thenReturn(Optional.empty());
            when(rubricRepository.save(rubric)).thenReturn(rubric);

            UpdateAnswerRubricRequest request = UpdateAnswerRubricRequest.builder()
                    .questionNumber(2)
                    .answerText("Updated")
                    .pointsAvailable(new BigDecimal("10.00"))
                    .gradingNotes("New notes")
                    .build();

            AnswerRubricResponse response = service.update(TEMPLATE_ID, RUBRIC_ID, request);

            assertThat(response.getQuestionNumber()).isEqualTo(2);
            assertThat(response.getAnswerText()).isEqualTo("Updated");
            assertThat(response.getPointsAvailable()).isEqualByComparingTo(new BigDecimal("10.00"));
            assertThat(response.getGradingNotes()).isEqualTo("New notes");
            verify(rubricRepository).save(rubric);
        }

        @Test
        @DisplayName("Should only update non-null fields (partial update)")
        void updatePartial() {
            ExamTemplate template = buildTemplate();
            AnswerRubric rubric = buildRubric(template, 1);
            rubric.setAnswerText("Original");
            rubric.setGradingNotes("Original notes");

            when(examTemplateRepository.existsById(TEMPLATE_ID)).thenReturn(true);
            when(rubricRepository.findById(RUBRIC_ID)).thenReturn(Optional.of(rubric));
            when(rubricRepository.save(rubric)).thenReturn(rubric);

            UpdateAnswerRubricRequest request = UpdateAnswerRubricRequest.builder()
                    .pointsAvailable(new BigDecimal("8.00"))
                    .build();

            AnswerRubricResponse response = service.update(TEMPLATE_ID, RUBRIC_ID, request);

            assertThat(response.getPointsAvailable()).isEqualByComparingTo(new BigDecimal("8.00"));
            assertThat(response.getAnswerText()).isEqualTo("Original");
            assertThat(response.getGradingNotes()).isEqualTo("Original notes");
            assertThat(response.getQuestionNumber()).isEqualTo(1);
        }

        @Test
        @DisplayName("Should allow same question number without triggering duplicate check")
        void updateAllowsSameQuestionNumber() {
            ExamTemplate template = buildTemplate();
            AnswerRubric rubric = buildRubric(template, 1);

            when(examTemplateRepository.existsById(TEMPLATE_ID)).thenReturn(true);
            when(rubricRepository.findById(RUBRIC_ID)).thenReturn(Optional.of(rubric));
            when(rubricRepository.save(rubric)).thenReturn(rubric);

            // Updating with the same question number — should not query for duplicates
            UpdateAnswerRubricRequest request = UpdateAnswerRubricRequest.builder()
                    .questionNumber(1)
                    .build();

            service.update(TEMPLATE_ID, RUBRIC_ID, request);

            verify(rubricRepository, never())
                    .findByExamTemplateIdAndQuestionNumber(any(), any());
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when template does not exist")
        void updateThrowsWhenTemplateNotFound() {
            when(examTemplateRepository.existsById(TEMPLATE_ID)).thenReturn(false);

            assertThatThrownBy(() -> service.update(TEMPLATE_ID, RUBRIC_ID,
                    UpdateAnswerRubricRequest.builder().build()))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("ExamTemplate");
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when rubric does not exist")
        void updateThrowsWhenRubricNotFound() {
            when(examTemplateRepository.existsById(TEMPLATE_ID)).thenReturn(true);
            when(rubricRepository.findById(RUBRIC_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.update(TEMPLATE_ID, RUBRIC_ID,
                    UpdateAnswerRubricRequest.builder().build()))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("AnswerRubric");
        }

        @Test
        @DisplayName("Should throw DuplicateQuestionNumberException when new question number conflicts")
        void updateThrowsOnDuplicateQuestionNumber() {
            ExamTemplate template = buildTemplate();
            AnswerRubric rubric = buildRubric(template, 1);
            AnswerRubric conflicting = buildRubric(template, 2);
            conflicting.setId(UUID.randomUUID());

            when(examTemplateRepository.existsById(TEMPLATE_ID)).thenReturn(true);
            when(rubricRepository.findById(RUBRIC_ID)).thenReturn(Optional.of(rubric));
            when(rubricRepository.findByExamTemplateIdAndQuestionNumber(TEMPLATE_ID, 2))
                    .thenReturn(Optional.of(conflicting));

            assertThatThrownBy(() -> service.update(TEMPLATE_ID, RUBRIC_ID,
                    UpdateAnswerRubricRequest.builder().questionNumber(2).build()))
                    .isInstanceOf(DuplicateQuestionNumberException.class)
                    .hasMessageContaining("2");
        }
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Delete rubric")
    class DeleteTests {

        @Test
        @DisplayName("Should delete rubric when template and rubric exist and match")
        void deleteSuccess() {
            ExamTemplate template = buildTemplate();
            AnswerRubric rubric = buildRubric(template, 1);

            when(examTemplateRepository.existsById(TEMPLATE_ID)).thenReturn(true);
            when(rubricRepository.findById(RUBRIC_ID)).thenReturn(Optional.of(rubric));

            service.delete(TEMPLATE_ID, RUBRIC_ID);

            verify(rubricRepository).delete(rubric);
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when template does not exist")
        void deleteThrowsWhenTemplateNotFound() {
            when(examTemplateRepository.existsById(TEMPLATE_ID)).thenReturn(false);

            assertThatThrownBy(() -> service.delete(TEMPLATE_ID, RUBRIC_ID))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("ExamTemplate");

            verify(rubricRepository, never()).delete(any());
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when rubric does not exist")
        void deleteThrowsWhenRubricNotFound() {
            when(examTemplateRepository.existsById(TEMPLATE_ID)).thenReturn(true);
            when(rubricRepository.findById(RUBRIC_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.delete(TEMPLATE_ID, RUBRIC_ID))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("AnswerRubric");

            verify(rubricRepository, never()).delete(any());
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when rubric belongs to a different template")
        void deleteThrowsWhenRubricBelongsToDifferentTemplate() {
            ExamTemplate otherTemplate = new ExamTemplate();
            otherTemplate.setId(UUID.randomUUID());
            AnswerRubric rubric = buildRubric(otherTemplate, 1);

            when(examTemplateRepository.existsById(TEMPLATE_ID)).thenReturn(true);
            when(rubricRepository.findById(RUBRIC_ID)).thenReturn(Optional.of(rubric));

            assertThatThrownBy(() -> service.delete(TEMPLATE_ID, RUBRIC_ID))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("AnswerRubric");

            verify(rubricRepository, never()).delete(any());
        }
    }
}
