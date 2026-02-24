package com.tracegrade.domain.repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.tracegrade.domain.model.GradingResult;

public interface GradingResultRepository extends JpaRepository<GradingResult, UUID> {

    Optional<GradingResult> findBySubmissionId(UUID submissionId);

    Optional<GradingResult> findByGradeId(UUID gradeId);

    List<GradingResult> findByNeedsReviewTrueAndReviewedAtIsNull();

    List<GradingResult> findByNeedsReviewTrueOrderByCreatedAtAsc();

        @Query(value = """
                        SELECT COUNT(gr.id)
                        FROM grading_results gr
                        INNER JOIN student_submissions ss ON ss.id = gr.submission_id
                        INNER JOIN students s ON s.id = ss.student_id
                        WHERE s.school_id = :schoolId
                            AND gr.created_at >= :sinceUtc
                            AND gr.created_at < :untilUtc
                        """, nativeQuery = true)
        long countSchoolGradedSince(@Param("schoolId") UUID schoolId,
                                    @Param("sinceUtc") Instant sinceUtc,
                                    @Param("untilUtc") Instant untilUtc);

        @Query(value = """
                        SELECT COUNT(gr.id)
                        FROM grading_results gr
                        INNER JOIN student_submissions ss ON ss.id = gr.submission_id
                        INNER JOIN students s ON s.id = ss.student_id
                        WHERE s.school_id = :schoolId
                            AND gr.needs_review = true
                            AND gr.reviewed_at IS NULL
                        """, nativeQuery = true)
        long countSchoolPendingReviews(@Param("schoolId") UUID schoolId);

        @Query(value = """
                        SELECT AVG(COALESCE(gr.final_score, gr.ai_score))
                        FROM grading_results gr
                        INNER JOIN student_submissions ss ON ss.id = gr.submission_id
                        INNER JOIN students s ON s.id = ss.student_id
                        WHERE s.school_id = :schoolId
                            AND (gr.final_score IS NOT NULL OR gr.ai_score IS NOT NULL)
                        """, nativeQuery = true)
        BigDecimal averageSchoolScore(@Param("schoolId") UUID schoolId);
}
