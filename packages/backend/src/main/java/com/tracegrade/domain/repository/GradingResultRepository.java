package com.tracegrade.domain.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tracegrade.domain.model.GradingResult;

public interface GradingResultRepository extends JpaRepository<GradingResult, UUID> {

    Optional<GradingResult> findBySubmissionId(UUID submissionId);

    List<GradingResult> findByNeedsReviewTrueAndReviewedAtIsNull();

    List<GradingResult> findByNeedsReviewTrueOrderByCreatedAtAsc();
}
