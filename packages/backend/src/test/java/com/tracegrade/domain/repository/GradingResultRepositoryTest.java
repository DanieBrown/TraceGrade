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

import com.tracegrade.domain.model.GradingResult;
import com.tracegrade.domain.model.StudentSubmission;
import com.tracegrade.domain.model.SubmissionStatus;

@DataJpaTest
@ActiveProfiles("test")
class GradingResultRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private GradingResultRepository gradingResultRepository;

    private StudentSubmission createAndPersistSubmission() {
        StudentSubmission submission = StudentSubmission.builder()
                .assignmentId(UUID.randomUUID())
                .studentId(UUID.randomUUID())
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
}
