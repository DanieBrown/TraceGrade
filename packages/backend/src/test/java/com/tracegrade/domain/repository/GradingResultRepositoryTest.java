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

import com.tracegrade.domain.model.GradingResult;
import com.tracegrade.domain.model.School;
import com.tracegrade.domain.model.SchoolType;
import com.tracegrade.domain.model.Student;
import com.tracegrade.domain.model.StudentSubmission;
import com.tracegrade.domain.model.SubmissionStatus;

@DataJpaTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class GradingResultRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private GradingResultRepository gradingResultRepository;

    private School createAndPersistSchool() {
        School school = School.builder()
                .name("Test School")
                .schoolType(SchoolType.HIGH)
                .build();
        return entityManager.persistAndFlush(school);
    }

    private Student createAndPersistStudent(School school, String email) {
        Student student = Student.builder()
                .school(school)
                .firstName("John")
                .lastName("Doe")
                .email(email)
                .isActive(true)
                .build();
        return entityManager.persistAndFlush(student);
    }

    private StudentSubmission createAndPersistSubmission() {
        return createAndPersistSubmission(UUID.randomUUID());
    }

    private StudentSubmission createAndPersistSubmission(UUID studentId) {
        StudentSubmission submission = StudentSubmission.builder()
                .assignmentId(UUID.randomUUID())
                .studentId(studentId)
                .submissionImageUrls("[\"s3://bucket/img.jpg\"]")
                .originalFormat("jpg")
                .status(SubmissionStatus.COMPLETED)
                .submittedAt(Instant.now())
                .build();
        return entityManager.persistAndFlush(submission);
    }

    @Test
    @DisplayName("Should save and retrieve a GradingResult")
    void shouldSaveAndRetrieve() {
        StudentSubmission submission = createAndPersistSubmission();

        GradingResult result = GradingResult.builder()
                .submission(submission)
                .aiScore(new BigDecimal("85.50"))
                .finalScore(new BigDecimal("87.00"))
                .confidenceScore(new BigDecimal("96.50"))
                .questionScores("[{\"q\":1,\"score\":85.5}]")
                .aiFeedback("Good work overall")
                .processingTimeMs(1500)
                .build();

        GradingResult saved = entityManager.persistAndFlush(result);
        entityManager.clear();

        Optional<GradingResult> found = gradingResultRepository.findById(saved.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getAiScore()).isEqualByComparingTo(new BigDecimal("85.50"));
        assertThat(found.get().getConfidenceScore()).isEqualByComparingTo(new BigDecimal("96.50"));
        assertThat(found.get().getNeedsReview()).isFalse();
        assertThat(found.get().getTeacherOverride()).isFalse();
    }

    @Test
    @DisplayName("Should find grading result by submission ID")
    void shouldFindBySubmissionId() {
        StudentSubmission submission = createAndPersistSubmission();

        entityManager.persistAndFlush(GradingResult.builder()
                .submission(submission)
                .confidenceScore(new BigDecimal("95.00"))
                .questionScores("[]")
                .build());
        entityManager.clear();

        Optional<GradingResult> found = gradingResultRepository.findBySubmissionId(submission.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getSubmission().getId()).isEqualTo(submission.getId());
    }

    @Test
    @DisplayName("Should find results needing review with no reviewer")
    void shouldFindNeedsReviewUnreviewed() {
        StudentSubmission sub1 = createAndPersistSubmission();
        StudentSubmission sub2 = createAndPersistSubmission();
        StudentSubmission sub3 = createAndPersistSubmission();

        // Needs review, not yet reviewed
        entityManager.persistAndFlush(GradingResult.builder()
                .submission(sub1)
                .confidenceScore(new BigDecimal("70.00"))
                .needsReview(true)
                .questionScores("[]")
                .build());

        // Needs review, already reviewed
        entityManager.persistAndFlush(GradingResult.builder()
                .submission(sub2)
                .confidenceScore(new BigDecimal("60.00"))
                .needsReview(true)
                .reviewedBy(UUID.randomUUID())
                .reviewedAt(Instant.now())
                .questionScores("[]")
                .build());

        // Does not need review
        entityManager.persistAndFlush(GradingResult.builder()
                .submission(sub3)
                .confidenceScore(new BigDecimal("98.00"))
                .questionScores("[]")
                .build());
        entityManager.clear();

        List<GradingResult> unreviewed = gradingResultRepository.findByNeedsReviewTrueAndReviewedAtIsNull();

        assertThat(unreviewed).hasSize(1);
        assertThat(unreviewed.get(0).getConfidenceScore()).isEqualByComparingTo(new BigDecimal("70.00"));
    }

    @Test
    @DisplayName("Should track teacher override flag")
    void shouldTrackTeacherOverride() {
        StudentSubmission submission = createAndPersistSubmission();

        GradingResult result = GradingResult.builder()
                .submission(submission)
                .aiScore(new BigDecimal("75.00"))
                .finalScore(new BigDecimal("80.00"))
                .confidenceScore(new BigDecimal("92.00"))
                .teacherOverride(true)
                .reviewedBy(UUID.randomUUID())
                .reviewedAt(Instant.now())
                .questionScores("[]")
                .build();

        GradingResult saved = entityManager.persistAndFlush(result);
        entityManager.clear();

        Optional<GradingResult> found = gradingResultRepository.findById(saved.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getTeacherOverride()).isTrue();
        assertThat(found.get().getReviewedBy()).isNotNull();
        assertThat(found.get().getReviewedAt()).isNotNull();
    }

    @Test
    @DisplayName("Should count school graded since UTC")
    void shouldCountSchoolGradedSince() {
        School school1 = createAndPersistSchool();
        School school2 = createAndPersistSchool();

        Student student1 = createAndPersistStudent(school1, "student1@test.com");
        Student student2 = createAndPersistStudent(school2, "student2@test.com");

        StudentSubmission sub1 = createAndPersistSubmission(student1.getId());
        StudentSubmission sub2 = createAndPersistSubmission(student1.getId());
        StudentSubmission sub3 = createAndPersistSubmission(student2.getId());

        Instant referenceUtc = Instant.parse("2026-01-15T12:00:00Z");
        Instant sinceUtc = referenceUtc.minusSeconds(3600);
        Instant untilUtc = referenceUtc.plusSeconds(3600);

        // In range, school 1
        GradingResult gr1 = GradingResult.builder()
                .submission(sub1)
                .confidenceScore(new BigDecimal("90.00"))
                .questionScores("[]")
                .build();
        gr1 = entityManager.persistAndFlush(gr1);
        entityManager.getEntityManager().createNativeQuery("UPDATE grading_results SET created_at = :date WHERE id = :id")
                .setParameter("date", referenceUtc)
                .setParameter("id", gr1.getId())
                .executeUpdate();

        // Out of range (before), school 1
        GradingResult gr2 = GradingResult.builder()
                .submission(sub2)
                .confidenceScore(new BigDecimal("80.00"))
                .questionScores("[]")
                .build();
        gr2 = entityManager.persistAndFlush(gr2);
        entityManager.getEntityManager().createNativeQuery("UPDATE grading_results SET created_at = :date WHERE id = :id")
                .setParameter("date", referenceUtc.minusSeconds(7200))
                .setParameter("id", gr2.getId())
                .executeUpdate();

        // In range, school 2
        GradingResult gr3 = GradingResult.builder()
                .submission(sub3)
                .confidenceScore(new BigDecimal("85.00"))
                .questionScores("[]")
                .build();
        gr3 = entityManager.persistAndFlush(gr3);
        entityManager.getEntityManager().createNativeQuery("UPDATE grading_results SET created_at = :date WHERE id = :id")
                .setParameter("date", referenceUtc)
                .setParameter("id", gr3.getId())
                .executeUpdate();

        entityManager.clear();

        long count = gradingResultRepository.countSchoolGradedSince(school1.getId(), sinceUtc, untilUtc);

        assertThat(count).isEqualTo(1);
    }

    @Test
    @DisplayName("Should count school pending reviews")
    void shouldCountSchoolPendingReviews() {
        School school1 = createAndPersistSchool();
        School school2 = createAndPersistSchool();

        Student student1 = createAndPersistStudent(school1, "student1@test.com");
        Student student2 = createAndPersistStudent(school2, "student2@test.com");

        StudentSubmission sub1 = createAndPersistSubmission(student1.getId());
        StudentSubmission sub2 = createAndPersistSubmission(student1.getId());
        StudentSubmission sub3 = createAndPersistSubmission(student2.getId());

        // Pending review, school 1
        entityManager.persistAndFlush(GradingResult.builder()
                .submission(sub1)
                .confidenceScore(new BigDecimal("70.00"))
                .needsReview(true)
                .questionScores("[]")
                .build());

        // Already reviewed, school 1
        entityManager.persistAndFlush(GradingResult.builder()
                .submission(sub2)
                .confidenceScore(new BigDecimal("60.00"))
                .needsReview(true)
                .reviewedBy(UUID.randomUUID())
                .reviewedAt(Instant.now())
                .questionScores("[]")
                .build());

        // Pending review, school 2
        entityManager.persistAndFlush(GradingResult.builder()
                .submission(sub3)
                .confidenceScore(new BigDecimal("65.00"))
                .needsReview(true)
                .questionScores("[]")
                .build());

        entityManager.clear();

        long count = gradingResultRepository.countSchoolPendingReviews(school1.getId());

        assertThat(count).isEqualTo(1);
    }

    @Test
    @DisplayName("Should calculate average school score")
    void shouldCalculateAverageSchoolScore() {
        School school1 = createAndPersistSchool();
        School school2 = createAndPersistSchool();

        Student student1 = createAndPersistStudent(school1, "student1@test.com");
        Student student2 = createAndPersistStudent(school2, "student2@test.com");

        StudentSubmission sub1 = createAndPersistSubmission(student1.getId());
        StudentSubmission sub2 = createAndPersistSubmission(student1.getId());
        StudentSubmission sub3 = createAndPersistSubmission(student1.getId());
        StudentSubmission sub4 = createAndPersistSubmission(student2.getId());

        // Has final score, school 1
        entityManager.persistAndFlush(GradingResult.builder()
                .submission(sub1)
                .aiScore(new BigDecimal("80.00"))
                .finalScore(new BigDecimal("85.00"))
                .confidenceScore(new BigDecimal("90.00"))
                .questionScores("[]")
                .build());

        // Has only AI score, school 1
        entityManager.persistAndFlush(GradingResult.builder()
                .submission(sub2)
                .aiScore(new BigDecimal("75.00"))
                .confidenceScore(new BigDecimal("85.00"))
                .questionScores("[]")
                .build());

        // Has no scores, school 1 (should be ignored)
        entityManager.persistAndFlush(GradingResult.builder()
                .submission(sub3)
                .confidenceScore(new BigDecimal("50.00"))
                .questionScores("[]")
                .build());

        // Has final score, school 2
        entityManager.persistAndFlush(GradingResult.builder()
                .submission(sub4)
                .finalScore(new BigDecimal("95.00"))
                .confidenceScore(new BigDecimal("95.00"))
                .questionScores("[]")
                .build());

        entityManager.clear();

        BigDecimal average = gradingResultRepository.averageSchoolScore(school1.getId());

        // (85.00 + 75.00) / 2 = 80.00
        assertThat(average).isEqualByComparingTo(new BigDecimal("80.00"));
    }

        @Test
        @DisplayName("Should return null average when school has no scorable results")
        void shouldReturnNullAverageWhenNoScorableResults() {
                School school = createAndPersistSchool();
                Student student = createAndPersistStudent(school, "student-non-scorable@test.com");

                StudentSubmission submission = createAndPersistSubmission(student.getId());

                entityManager.persistAndFlush(GradingResult.builder()
                                .submission(submission)
                                .confidenceScore(new BigDecimal("88.00"))
                                .questionScores("[]")
                                .build());

                entityManager.clear();

                BigDecimal average = gradingResultRepository.averageSchoolScore(school.getId());

                assertThat(average).isNull();
        }
}
