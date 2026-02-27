package com.tracegrade.domain.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
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

import com.tracegrade.domain.model.ExamTemplate;
import com.tracegrade.domain.model.StudentSubmission;
import com.tracegrade.domain.model.SubmissionStatus;

@DataJpaTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class StudentSubmissionRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private StudentSubmissionRepository studentSubmissionRepository;

    private StudentSubmission buildSubmission(UUID assignmentId, UUID studentId, SubmissionStatus status) {
        return StudentSubmission.builder()
                .assignmentId(assignmentId)
                .studentId(studentId)
                .submissionImageUrls("[\"s3://bucket/image1.jpg\"]")
                .originalFormat("jpg")
                .status(status)
                .submittedAt(Instant.now())
                .build();
    }

    @Test
    @DisplayName("Should save and retrieve a StudentSubmission")
    void shouldSaveAndRetrieve() {
        UUID assignmentId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        StudentSubmission submission = buildSubmission(assignmentId, studentId, SubmissionStatus.PENDING);
        StudentSubmission saved = entityManager.persistAndFlush(submission);
        entityManager.clear();

        Optional<StudentSubmission> found = studentSubmissionRepository.findById(saved.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getAssignmentId()).isEqualTo(assignmentId);
        assertThat(found.get().getStudentId()).isEqualTo(studentId);
        assertThat(found.get().getStatus()).isEqualTo(SubmissionStatus.PENDING);
        assertThat(found.get().getOriginalFormat()).isEqualTo("jpg");
    }

    @Test
    @DisplayName("Should persist enum as string")
    void shouldPersistEnumAsString() {
        StudentSubmission submission = buildSubmission(UUID.randomUUID(), UUID.randomUUID(), SubmissionStatus.PROCESSING);
        StudentSubmission saved = entityManager.persistAndFlush(submission);
        entityManager.clear();

        Optional<StudentSubmission> found = studentSubmissionRepository.findById(saved.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getStatus()).isEqualTo(SubmissionStatus.PROCESSING);
    }

    @Test
    @DisplayName("Should find submissions by assignment and student")
    void shouldFindByAssignmentAndStudent() {
        UUID assignmentId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        entityManager.persistAndFlush(buildSubmission(assignmentId, studentId, SubmissionStatus.COMPLETED));
        entityManager.persistAndFlush(buildSubmission(assignmentId, UUID.randomUUID(), SubmissionStatus.PENDING));
        entityManager.clear();

        List<StudentSubmission> results = studentSubmissionRepository
                .findByAssignmentIdAndStudentId(assignmentId, studentId);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getStudentId()).isEqualTo(studentId);
    }

    @Test
    @DisplayName("Should find submissions by status")
    void shouldFindByStatus() {
        entityManager.persistAndFlush(buildSubmission(UUID.randomUUID(), UUID.randomUUID(), SubmissionStatus.PENDING));
        entityManager.persistAndFlush(buildSubmission(UUID.randomUUID(), UUID.randomUUID(), SubmissionStatus.PENDING));
        entityManager.persistAndFlush(buildSubmission(UUID.randomUUID(), UUID.randomUUID(), SubmissionStatus.COMPLETED));
        entityManager.clear();

        List<StudentSubmission> pending = studentSubmissionRepository.findByStatus(SubmissionStatus.PENDING);
        List<StudentSubmission> completed = studentSubmissionRepository.findByStatus(SubmissionStatus.COMPLETED);

        assertThat(pending).hasSize(2);
        assertThat(completed).hasSize(1);
    }

    @Test
    @DisplayName("Should associate submission with exam template")
    void shouldAssociateWithExamTemplate() {
        ExamTemplate template = entityManager.persistAndFlush(ExamTemplate.builder()
                .teacherId(UUID.randomUUID())
                .name("Test Exam")
                .totalPoints(new BigDecimal("100.00"))
                .questionsJson("[]")
                .build());

        StudentSubmission submission = StudentSubmission.builder()
                .assignmentId(UUID.randomUUID())
                .studentId(UUID.randomUUID())
                .examTemplate(template)
                .submissionImageUrls("[\"s3://bucket/img.jpg\"]")
                .originalFormat("jpg")
                .submittedAt(Instant.now())
                .build();

        StudentSubmission saved = entityManager.persistAndFlush(submission);
        entityManager.clear();

        Optional<StudentSubmission> found = studentSubmissionRepository.findById(saved.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getExamTemplate()).isNotNull();
        assertThat(found.get().getExamTemplate().getId()).isEqualTo(template.getId());
    }
}
