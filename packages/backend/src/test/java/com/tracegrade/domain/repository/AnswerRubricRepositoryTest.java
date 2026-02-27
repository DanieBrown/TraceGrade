package com.tracegrade.domain.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import com.tracegrade.domain.model.AnswerRubric;
import com.tracegrade.domain.model.ExamTemplate;

@DataJpaTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class AnswerRubricRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private AnswerRubricRepository answerRubricRepository;

    private ExamTemplate createAndPersistExamTemplate() {
        ExamTemplate template = ExamTemplate.builder()
                .teacherId(UUID.randomUUID())
                .name("Test Exam")
                .totalPoints(new BigDecimal("100.00"))
                .questionsJson("[]")
                .build();
        return entityManager.persistAndFlush(template);
    }

    @Test
    @DisplayName("Should save and retrieve an AnswerRubric")
    void shouldSaveAndRetrieve() {
        ExamTemplate template = createAndPersistExamTemplate();

        AnswerRubric rubric = AnswerRubric.builder()
                .examTemplate(template)
                .questionNumber(1)
                .answerText("42")
                .pointsAvailable(new BigDecimal("10.00"))
                .gradingNotes("Accept equivalent expressions")
                .build();

        AnswerRubric saved = entityManager.persistAndFlush(rubric);
        entityManager.clear();

        Optional<AnswerRubric> found = answerRubricRepository.findById(saved.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getQuestionNumber()).isEqualTo(1);
        assertThat(found.get().getAnswerText()).isEqualTo("42");
        assertThat(found.get().getPointsAvailable()).isEqualByComparingTo(new BigDecimal("10.00"));
    }

    @Test
    @DisplayName("Should find rubrics by exam template ID ordered by question number")
    void shouldFindByExamTemplateIdOrdered() {
        ExamTemplate template = createAndPersistExamTemplate();

        entityManager.persistAndFlush(AnswerRubric.builder()
                .examTemplate(template)
                .questionNumber(3)
                .pointsAvailable(new BigDecimal("10.00"))
                .build());
        entityManager.persistAndFlush(AnswerRubric.builder()
                .examTemplate(template)
                .questionNumber(1)
                .pointsAvailable(new BigDecimal("20.00"))
                .build());
        entityManager.persistAndFlush(AnswerRubric.builder()
                .examTemplate(template)
                .questionNumber(2)
                .pointsAvailable(new BigDecimal("15.00"))
                .build());
        entityManager.clear();

        List<AnswerRubric> rubrics = answerRubricRepository
                .findByExamTemplateIdOrderByQuestionNumberAsc(template.getId());

        assertThat(rubrics).hasSize(3);
        assertThat(rubrics).extracting(AnswerRubric::getQuestionNumber)
                .containsExactly(1, 2, 3);
    }

    @Test
    @DisplayName("Should find rubric by exam template ID and question number")
    void shouldFindByExamTemplateIdAndQuestionNumber() {
        ExamTemplate template = createAndPersistExamTemplate();

        entityManager.persistAndFlush(AnswerRubric.builder()
                .examTemplate(template)
                .questionNumber(1)
                .answerText("Answer 1")
                .pointsAvailable(new BigDecimal("10.00"))
                .build());
        entityManager.persistAndFlush(AnswerRubric.builder()
                .examTemplate(template)
                .questionNumber(2)
                .answerText("Answer 2")
                .pointsAvailable(new BigDecimal("20.00"))
                .build());
        entityManager.clear();

        Optional<AnswerRubric> found = answerRubricRepository
                .findByExamTemplateIdAndQuestionNumber(template.getId(), 2);

        assertThat(found).isPresent();
        assertThat(found.get().getAnswerText()).isEqualTo("Answer 2");
    }

    @Test
    @DisplayName("Should cascade delete rubrics when exam template is deleted")
    void shouldCascadeDeleteFromExamTemplate() {
        ExamTemplate template = createAndPersistExamTemplate();

        entityManager.persistAndFlush(AnswerRubric.builder()
                .examTemplate(template)
                .questionNumber(1)
                .pointsAvailable(new BigDecimal("10.00"))
                .build());
        entityManager.clear();

        assertThat(answerRubricRepository.findByExamTemplateIdOrderByQuestionNumberAsc(template.getId()))
                .hasSize(1);

        ExamTemplate managed = entityManager.find(ExamTemplate.class, template.getId());
        entityManager.remove(managed);
        entityManager.flush();
        entityManager.clear();

        assertThat(answerRubricRepository.findByExamTemplateIdOrderByQuestionNumberAsc(template.getId()))
                .isEmpty();
    }
}
