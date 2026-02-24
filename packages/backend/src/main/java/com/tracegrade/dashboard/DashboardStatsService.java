package com.tracegrade.dashboard;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tracegrade.domain.repository.GradingResultRepository;
import com.tracegrade.domain.repository.SchoolRepository;
import com.tracegrade.domain.repository.StudentRepository;
import com.tracegrade.dto.response.DashboardStatsResponse;
import com.tracegrade.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DashboardStatsService {

    private static final int WEEK_WINDOW_DAYS = 7;
    private static final int CLASS_COUNT_PLACEHOLDER = 0;
    private static final BigDecimal ZERO_AVERAGE = new BigDecimal("0.0");

    private final SchoolRepository schoolRepository;
    private final StudentRepository studentRepository;
    private final GradingResultRepository gradingResultRepository;

    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats(UUID schoolId) {
        schoolRepository.findById(schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("School", schoolId));

        Instant untilUtc = Instant.now();
        Instant sinceUtc = untilUtc.minus(WEEK_WINDOW_DAYS, ChronoUnit.DAYS);
        validateBoundedInterval(sinceUtc, untilUtc);

        long totalStudents = studentRepository.countBySchoolIdAndIsActiveTrue(schoolId);
        long gradedThisWeek = gradingResultRepository.countSchoolGradedSince(schoolId, sinceUtc, untilUtc);
        long pendingReviews = gradingResultRepository.countSchoolPendingReviews(schoolId);
        BigDecimal classAverage = toDeterministicClassAverage(gradingResultRepository.averageSchoolScore(schoolId));

        return DashboardStatsResponse.builder()
                .totalStudents(totalStudents)
                .classCount(CLASS_COUNT_PLACEHOLDER)
                .gradedThisWeek(gradedThisWeek)
                .pendingReviews(pendingReviews)
                .classAverage(classAverage)
                .letterGrade(deriveLetterGrade(classAverage))
                .build();
    }

    private void validateBoundedInterval(Instant sinceUtc, Instant untilUtc) {
        if (!sinceUtc.isBefore(untilUtc)) {
            throw new IllegalArgumentException("sinceUtc must be before untilUtc");
        }
    }

    private BigDecimal toDeterministicClassAverage(BigDecimal rawAverage) {
        if (rawAverage == null) {
            return ZERO_AVERAGE;
        }
        return rawAverage.setScale(1, RoundingMode.HALF_UP);
    }

    private String deriveLetterGrade(BigDecimal classAverage) {
        if (classAverage.compareTo(new BigDecimal("90.0")) >= 0) {
            return "A";
        }
        if (classAverage.compareTo(new BigDecimal("80.0")) >= 0) {
            return "B";
        }
        if (classAverage.compareTo(new BigDecimal("70.0")) >= 0) {
            return "C";
        }
        if (classAverage.compareTo(new BigDecimal("60.0")) >= 0) {
            return "D";
        }
        return "F";
    }
}