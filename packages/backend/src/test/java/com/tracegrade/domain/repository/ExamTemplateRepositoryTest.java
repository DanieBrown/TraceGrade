package com.tracegrade.domain.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import jakarta.validation.ConstraintViolationException;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import com.tracegrade.domain.model.AnswerRubric;
import com.tracegrade.domain.model.DifficultyLevel;
import com.tracegrade.domain.model.ExamTemplate;

@DataJpaTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class ExamTemplateRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private ExamTemplateRepository examTemplateRepository;

    @Test
    @DisplayName("Should save and retrieve an ExamTemplate")
    void shouldSaveAndRetrieve() {
        UUID teacherId = UUID.randomUUID();
        ExamTemplate template = ExamTemplate.builder()
                .teacherId(teacherId)
                .name("Math Final Exam")
                .subject("Mathematics")
                .totalPoints(new BigDecimal("100.00"))
                .questionsJson("[{\"q\":1}]")
                .difficultyLevel(DifficultyLevel.MEDIUM)
                .build();

        ExamTemplate saved = entityManager.persistAndFlush(template);
        entityManager.clear();

        Optional<ExamTemplate> found = examTemplateRepository.findById(saved.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Math Final Exam");
        assertThat(found.get().getTeacherId()).isEqualTo(teacherId);
        assertThat(found.get().getSubject()).isEqualTo("Mathematics");
        assertThat(found.get().getDifficultyLevel()).isEqualTo(DifficultyLevel.MEDIUM);
    }

    @Test
    @DisplayName("Should auto-populate createdAt and updatedAt on persist")
    void shouldAutoPopulateTimestamps() {
        ExamTemplate template = ExamTemplate.builder()
                .teacherId(UUID.randomUUID())
                .name("Timestamp Test")
                .totalPoints(new BigDecimal("100.00"))
                .questionsJson("[]")
                .build();

        ExamTemplate saved = entityManager.persistAndFlush(template);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("Should find exam templates by teacher ID ordered by created_at desc")
    void shouldFindByTeacherId() {
        UUID teacherId = UUID.randomUUID();
        entityManager.persistAndFlush(ExamTemplate.builder()
                .teacherId(teacherId)
                .name("Exam 1")
                .totalPoints(new BigDecimal("50.00"))
                .questionsJson("[]")
                .build());
        entityManager.persistAndFlush(ExamTemplate.builder()
                .teacherId(teacherId)
                .name("Exam 2")
                .totalPoints(new BigDecimal("100.00"))
                .questionsJson("[]")
                .build());
        entityManager.persistAndFlush(ExamTemplate.builder()
                .teacherId(UUID.randomUUID())
                .name("Other Teacher Exam")
                .totalPoints(new BigDecimal("75.00"))
                .questionsJson("[]")
                .build());
        entityManager.clear();

        List<ExamTemplate> results = examTemplateRepository.findByTeacherIdOrderByCreatedAtDesc(teacherId);

        assertThat(results).hasSize(2);
        assertThat(results).extracting(ExamTemplate::getTeacherId).containsOnly(teacherId);
    }

    @Test
    @DisplayName("Should find exam templates by teacher ID and subject")
    void shouldFindByTeacherIdAndSubject() {
        UUID teacherId = UUID.randomUUID();
        entityManager.persistAndFlush(ExamTemplate.builder()
                .teacherId(teacherId)
                .name("Math Exam")
                .subject("Mathematics")
                .totalPoints(new BigDecimal("100.00"))
                .questionsJson("[]")
                .build());
        entityManager.persistAndFlush(ExamTemplate.builder()
                .teacherId(teacherId)
                .name("Science Exam")
                .subject("Science")
                .totalPoints(new BigDecimal("100.00"))
                .questionsJson("[]")
                .build());
        entityManager.clear();

        List<ExamTemplate> results = examTemplateRepository.findByTeacherIdAndSubject(teacherId, "Mathematics");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getName()).isEqualTo("Math Exam");
    }

    @Test
    @DisplayName("Should reject ExamTemplate when required fields are missing")
    void shouldRejectWhenRequiredFieldsMissing() {
        ExamTemplate template = ExamTemplate.builder()
                .name("")
                .build();

        assertThatThrownBy(() -> entityManager.persistAndFlush(template))
                .isInstanceOf(ConstraintViolationException.class);
    }

    @Test
    @DisplayName("Should load AnswerRubrics when fetching ExamTemplate")
    void shouldLoadAnswerRubricsRelationship() {
        ExamTemplate template = ExamTemplate.builder()
                .teacherId(UUID.randomUUID())
                .name("Rubric Test Exam")
                .totalPoints(new BigDecimal("100.00"))
                .questionsJson("[{\"q\":1},{\"q\":2}]")
                .build();
        ExamTemplate saved = entityManager.persistAndFlush(template);

        AnswerRubric rubric1 = AnswerRubric.builder()
                .examTemplate(saved)
                .questionNumber(1)
                .answerText("Answer 1")
                .pointsAvailable(new BigDecimal("50.00"))
                .build();
        AnswerRubric rubric2 = AnswerRubric.builder()
                .examTemplate(saved)
                .questionNumber(2)
                .answerText("Answer 2")
                .pointsAvailable(new BigDecimal("50.00"))
                .build();
        entityManager.persistAndFlush(rubric1);
        entityManager.persistAndFlush(rubric2);
        entityManager.clear();

        ExamTemplate found = examTemplateRepository.findById(saved.getId()).orElseThrow();

        assertThat(found.getAnswerRubrics()).hasSize(2);
        assertThat(found.getAnswerRubrics())
                .extracting(AnswerRubric::getQuestionNumber)
                .containsExactlyInAnyOrder(1, 2);
    }

    @Test
    @DisplayName("Should save and retrieve description and gradeLevel fields")
    void shouldSaveAndRetrieveNewFields() {
        ExamTemplate template = ExamTemplate.builder()
                .teacherId(UUID.randomUUID())
                .name("Grade Level Test")
                .subject("Science")
                .gradeLevel("10th Grade")
                .description("A comprehensive science exam covering chemistry basics")
                .totalPoints(new BigDecimal("100.00"))
                .questionsJson("[]")
                .build();

        ExamTemplate saved = entityManager.persistAndFlush(template);
        entityManager.clear();

        ExamTemplate found = examTemplateRepository.findById(saved.getId()).orElseThrow();

        assertThat(found.getDescription()).isEqualTo("A comprehensive science exam covering chemistry basics");
        assertThat(found.getGradeLevel()).isEqualTo("10th Grade");
    }

    @Test
    @DisplayName("Should find exam templates by grade level")
    void shouldFindByGradeLevel() {
        UUID teacherId = UUID.randomUUID();
        entityManager.persistAndFlush(ExamTemplate.builder()
                .teacherId(teacherId)
                .name("3rd Grade Math")
                .gradeLevel("3rd Grade")
                .totalPoints(new BigDecimal("50.00"))
                .questionsJson("[]")
                .build());
        entityManager.persistAndFlush(ExamTemplate.builder()
                .teacherId(teacherId)
                .name("10th Grade Math")
                .gradeLevel("10th Grade")
                .totalPoints(new BigDecimal("100.00"))
                .questionsJson("[]")
                .build());
        entityManager.clear();

        List<ExamTemplate> results = examTemplateRepository.findByGradeLevel("3rd Grade");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getName()).isEqualTo("3rd Grade Math");
    }

    @Test
    @DisplayName("Should find exam templates by subject and grade level")
    void shouldFindBySubjectAndGradeLevel() {
        UUID teacherId = UUID.randomUUID();
        entityManager.persistAndFlush(ExamTemplate.builder()
                .teacherId(teacherId)
                .name("3rd Grade Math")
                .subject("Mathematics")
                .gradeLevel("3rd Grade")
                .totalPoints(new BigDecimal("50.00"))
                .questionsJson("[]")
                .build());
        entityManager.persistAndFlush(ExamTemplate.builder()
                .teacherId(teacherId)
                .name("3rd Grade Science")
                .subject("Science")
                .gradeLevel("3rd Grade")
                .totalPoints(new BigDecimal("100.00"))
                .questionsJson("[]")
                .build());
        entityManager.clear();

        List<ExamTemplate> results = examTemplateRepository.findBySubjectAndGradeLevel("Mathematics", "3rd Grade");

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getName()).isEqualTo("3rd Grade Math");
    }
}
