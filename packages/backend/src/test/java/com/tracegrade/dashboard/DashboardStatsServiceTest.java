package com.tracegrade.dashboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.tracegrade.domain.model.School;
import com.tracegrade.domain.repository.GradingResultRepository;
import com.tracegrade.domain.repository.SchoolRepository;
import com.tracegrade.domain.repository.StudentRepository;
import com.tracegrade.dto.response.DashboardStatsResponse;
import com.tracegrade.exception.ResourceNotFoundException;

@SuppressWarnings("null") // Mockito and repository @NonNull contracts
class DashboardStatsServiceTest {

    private static final UUID SCHOOL_ID = UUID.randomUUID();

    private SchoolRepository schoolRepository;
    private StudentRepository studentRepository;
    private GradingResultRepository gradingResultRepository;
    private DashboardStatsService service;

    @BeforeEach
    void setUp() {
        schoolRepository = mock(SchoolRepository.class);
        studentRepository = mock(StudentRepository.class);
        gradingResultRepository = mock(GradingResultRepository.class);
        service = new DashboardStatsService(schoolRepository, studentRepository, gradingResultRepository);
    }

    @Test
    @DisplayName("Throws ResourceNotFoundException when school does not exist")
    void throwsWhenSchoolDoesNotExist() {
        when(schoolRepository.findById(SCHOOL_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getDashboardStats(SCHOOL_ID))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining(SCHOOL_ID.toString());

        verifyNoInteractions(studentRepository, gradingResultRepository);
    }

    @Test
    @DisplayName("Returns zero defaults with F letter grade when no school data exists")
    void returnsZeroedStatsWhenNoData() {
        when(schoolRepository.findById(SCHOOL_ID)).thenReturn(Optional.of(School.builder().build()));
        when(studentRepository.countBySchoolIdAndIsActiveTrue(SCHOOL_ID)).thenReturn(0L);
        when(gradingResultRepository.countSchoolGradedSince(any(), any(), any())).thenReturn(0L);
        when(gradingResultRepository.countSchoolPendingReviews(SCHOOL_ID)).thenReturn(0L);
        when(gradingResultRepository.averageSchoolScore(SCHOOL_ID)).thenReturn(null);

        DashboardStatsResponse response = service.getDashboardStats(SCHOOL_ID);

        assertThat(response.getTotalStudents()).isZero();
        assertThat(response.getClassCount()).isZero();
        assertThat(response.getGradedThisWeek()).isZero();
        assertThat(response.getPendingReviews()).isZero();
        assertThat(response.getClassAverage()).isEqualByComparingTo("0.0");
        assertThat(response.getLetterGrade()).isEqualTo("F");
    }

    @Test
    @DisplayName("Uses bounded UTC interval [sinceUtc, untilUtc) where sinceUtc is exactly 7 days before untilUtc")
    void usesBoundedUtcInterval() {
        when(schoolRepository.findById(SCHOOL_ID)).thenReturn(Optional.of(School.builder().build()));
        when(studentRepository.countBySchoolIdAndIsActiveTrue(SCHOOL_ID)).thenReturn(10L);
        when(gradingResultRepository.countSchoolGradedSince(any(), any(), any())).thenReturn(4L);
        when(gradingResultRepository.countSchoolPendingReviews(SCHOOL_ID)).thenReturn(1L);
        when(gradingResultRepository.averageSchoolScore(SCHOOL_ID)).thenReturn(new BigDecimal("88.44"));

        service.getDashboardStats(SCHOOL_ID);

        ArgumentCaptor<Instant> sinceCaptor = ArgumentCaptor.forClass(Instant.class);
        ArgumentCaptor<Instant> untilCaptor = ArgumentCaptor.forClass(Instant.class);
        verify(gradingResultRepository).countSchoolGradedSince(any(), sinceCaptor.capture(), untilCaptor.capture());

        Instant sinceUtc = sinceCaptor.getValue();
        Instant untilUtc = untilCaptor.getValue();
        assertThat(sinceUtc).isBefore(untilUtc);
        assertThat(Duration.between(sinceUtc, untilUtc)).isEqualTo(Duration.ofDays(7));
    }

    @Test
    @DisplayName("Rounds class average to one decimal and derives grade A at 90.0")
    void roundsAndDerivesGradeA() {
        when(schoolRepository.findById(SCHOOL_ID)).thenReturn(Optional.of(School.builder().build()));
        when(studentRepository.countBySchoolIdAndIsActiveTrue(SCHOOL_ID)).thenReturn(33L);
        when(gradingResultRepository.countSchoolGradedSince(any(), any(), any())).thenReturn(11L);
        when(gradingResultRepository.countSchoolPendingReviews(SCHOOL_ID)).thenReturn(2L);
        when(gradingResultRepository.averageSchoolScore(SCHOOL_ID)).thenReturn(new BigDecimal("89.95"));

        DashboardStatsResponse response = service.getDashboardStats(SCHOOL_ID);

        assertThat(response.getClassAverage()).isEqualByComparingTo("90.0");
        assertThat(response.getLetterGrade()).isEqualTo("A");
    }

    @Test
    @DisplayName("Derives grade thresholds B, C, D, and F from rounded class average")
    void derivesRemainingGradeThresholds() {
        when(schoolRepository.findById(SCHOOL_ID)).thenReturn(Optional.of(School.builder().build()));
        when(studentRepository.countBySchoolIdAndIsActiveTrue(SCHOOL_ID)).thenReturn(1L);
        when(gradingResultRepository.countSchoolGradedSince(any(), any(), any())).thenReturn(1L);
        when(gradingResultRepository.countSchoolPendingReviews(SCHOOL_ID)).thenReturn(0L);

        when(gradingResultRepository.averageSchoolScore(SCHOOL_ID)).thenReturn(new BigDecimal("80.00"));
        assertThat(service.getDashboardStats(SCHOOL_ID).getLetterGrade()).isEqualTo("B");

        when(gradingResultRepository.averageSchoolScore(SCHOOL_ID)).thenReturn(new BigDecimal("79.94"));
        assertThat(service.getDashboardStats(SCHOOL_ID).getLetterGrade()).isEqualTo("C");

        when(gradingResultRepository.averageSchoolScore(SCHOOL_ID)).thenReturn(new BigDecimal("60.00"));
        assertThat(service.getDashboardStats(SCHOOL_ID).getLetterGrade()).isEqualTo("D");

        when(gradingResultRepository.averageSchoolScore(SCHOOL_ID)).thenReturn(new BigDecimal("59.94"));
        assertThat(service.getDashboardStats(SCHOOL_ID).getLetterGrade()).isEqualTo("F");
    }
}