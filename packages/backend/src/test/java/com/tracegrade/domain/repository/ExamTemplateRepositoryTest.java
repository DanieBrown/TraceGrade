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

import com.tracegrade.domain.model.DifficultyLevel;
import com.tracegrade.domain.model.ExamTemplate;

@DataJpaTest
@ActiveProfiles("test")
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
}
