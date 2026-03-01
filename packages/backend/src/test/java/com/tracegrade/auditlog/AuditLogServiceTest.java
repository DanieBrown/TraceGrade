package com.tracegrade.auditlog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.tracegrade.domain.model.AuditEventType;
import com.tracegrade.domain.model.ExamTemplate;
import com.tracegrade.domain.model.GradeAuditLog;
import com.tracegrade.domain.model.GradingResult;
import com.tracegrade.domain.model.StudentSubmission;
import com.tracegrade.domain.repository.GradeAuditLogRepository;
import com.tracegrade.dto.response.GradeAuditLogResponse;

/**
 * Unit tests for {@link AuditLogServiceImpl}.
 *
 * <p>Uses pure Mockito — no Spring context loaded.
 * All three event types, all four query dispatch branches, failure resilience, and
 * EC-8 / EC-9 edge cases are covered.
 */
@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    // ── constants ───────────────────────────────────────────────────────────
    private static final UUID   SUBMISSION_ID    = UUID.randomUUID();
    private static final UUID   STUDENT_ID       = UUID.randomUUID();
    private static final UUID   TEMPLATE_ID      = UUID.randomUUID();
    private static final UUID   GRADE_ID         = UUID.randomUUID();
    private static final UUID   REVIEWER_ID      = UUID.randomUUID();

    private static final BigDecimal AI_SCORE         = new BigDecimal("85.50");
    private static final BigDecimal CONFIDENCE        = new BigDecimal("92.00");
    private static final BigDecimal FINAL_SCORE       = new BigDecimal("90.00");
    private static final BigDecimal PREV_FINAL_SCORE  = new BigDecimal("85.50");

    private static final Instant FROM = Instant.parse("2024-01-01T00:00:00Z");
    private static final Instant TO   = Instant.parse("2024-01-31T23:59:59Z");

    // ── mocks & subject ─────────────────────────────────────────────────────
    @Mock
    private GradeAuditLogRepository gradeAuditLogRepository;

    @InjectMocks
    private AuditLogServiceImpl auditLogService;

    // ── helpers ─────────────────────────────────────────────────────────────

    /** Build a fully-populated StudentSubmission stub. */
    private StudentSubmission buildSubmission(UUID studentId, boolean withTemplate) {
        ExamTemplate template = null;
        if (withTemplate) {
            template = new ExamTemplate();
            template.setId(TEMPLATE_ID);
        }
        return StudentSubmission.builder()
                .assignmentId(UUID.randomUUID())
                .studentId(studentId)
                .examTemplate(template)
                .submissionImageUrls("https://example.com/img.jpg")
                .originalFormat("PDF")
                .submittedAt(Instant.now())
                .build();
    }

    /** Set the inherited {@code id} field (from BaseEntity) via the setter Lombok generates. */
    private void setId(com.tracegrade.domain.model.BaseEntity entity, UUID id) {
        entity.setId(id);
    }

    /** Build a GradingResult attached to the given submission. */
    private GradingResult buildGradingResult(StudentSubmission submission) {
        GradingResult result = GradingResult.builder()
                .submission(submission)
                .gradeId(GRADE_ID)
                .aiScore(AI_SCORE)
                .finalScore(FINAL_SCORE)
                .confidenceScore(CONFIDENCE)
                .questionScores("{}")
                .reviewedBy(REVIEWER_ID)
                .build();
        setId(result, UUID.randomUUID());
        return result;
    }

    // ════════════════════════════════════════════════════════════════════════
    // Event-type write tests
    // ════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("logAiGradingSuccess")
    class LogAiGradingSuccess {

        @Test
        @DisplayName("saves GradeAuditLog with AI_GRADING_SUCCESS and correct key fields")
        void testLogAiGradingSuccess_savesCorrectRecord() {
            StudentSubmission submission = buildSubmission(STUDENT_ID, true);
            setId(submission, SUBMISSION_ID);
            GradingResult result = buildGradingResult(submission);

            when(gradeAuditLogRepository.save(any(GradeAuditLog.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            auditLogService.logAiGradingSuccess(result);

            ArgumentCaptor<GradeAuditLog> captor = forClass(GradeAuditLog.class);
            verify(gradeAuditLogRepository).save(captor.capture());

            GradeAuditLog saved = captor.getValue();
            assertThat(saved.getEventType()).isEqualTo(AuditEventType.AI_GRADING_SUCCESS);
            assertThat(saved.getSubmissionId()).isEqualTo(SUBMISSION_ID);
            assertThat(saved.getStudentId()).isEqualTo(STUDENT_ID);
            assertThat(saved.getOriginalAiScore()).isEqualByComparingTo(AI_SCORE);
            assertThat(saved.getConfidenceLevel()).isEqualByComparingTo(CONFIDENCE);
            assertThat(saved.getTeacherModifiedScore()).isNull();
            assertThat(saved.getOverrideReason()).isNull();
            assertThat(saved.getReviewerId()).isNull();
            assertThat(saved.getGradingResultGradeId()).isEqualTo(GRADE_ID);
        }

        @Test
        @DisplayName("swallows RuntimeException thrown by repository — does not propagate")
        void testLogAiGradingSuccess_repositoryException_doesNotPropagate() {
            StudentSubmission submission = buildSubmission(STUDENT_ID, true);
            setId(submission, SUBMISSION_ID);
            GradingResult result = buildGradingResult(submission);

            doThrow(new RuntimeException("DB unavailable"))
                    .when(gradeAuditLogRepository).save(any(GradeAuditLog.class));

            assertDoesNotThrow(() -> auditLogService.logAiGradingSuccess(result));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("logAiGradingFailure")
    class LogAiGradingFailure {

        @Test
        @DisplayName("saves GradeAuditLog with AI_GRADING_FAILURE and originalAiScore = 0 (EC-7)")
        void testLogAiGradingFailure_savesCorrectRecord() {
            StudentSubmission submission = buildSubmission(STUDENT_ID, true);
            setId(submission, SUBMISSION_ID);

            when(gradeAuditLogRepository.save(any(GradeAuditLog.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            auditLogService.logAiGradingFailure(submission);

            ArgumentCaptor<GradeAuditLog> captor = forClass(GradeAuditLog.class);
            verify(gradeAuditLogRepository).save(captor.capture());

            GradeAuditLog saved = captor.getValue();
            assertThat(saved.getEventType()).isEqualTo(AuditEventType.AI_GRADING_FAILURE);
            assertThat(saved.getSubmissionId()).isEqualTo(SUBMISSION_ID);
            assertThat(saved.getStudentId()).isEqualTo(STUDENT_ID);
            assertThat(saved.getOriginalAiScore()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(saved.getConfidenceLevel()).isNull();
            assertThat(saved.getTeacherModifiedScore()).isNull();
            assertThat(saved.getOverrideReason()).isNull();
            assertThat(saved.getGradingResultGradeId()).isNull();
        }

        @Test
        @DisplayName("swallows RuntimeException thrown by repository — does not propagate")
        void testLogAiGradingFailure_repositoryException_doesNotPropagate() {
            StudentSubmission submission = buildSubmission(STUDENT_ID, true);
            setId(submission, SUBMISSION_ID);

            doThrow(new RuntimeException("DB unavailable"))
                    .when(gradeAuditLogRepository).save(any(GradeAuditLog.class));

            assertDoesNotThrow(() -> auditLogService.logAiGradingFailure(submission));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("logTeacherOverride")
    class LogTeacherOverride {

        @Test
        @DisplayName("saves GradeAuditLog with TEACHER_OVERRIDE and correct scores / override fields")
        void testLogTeacherOverride_savesCorrectRecord() {
            StudentSubmission submission = buildSubmission(STUDENT_ID, true);
            setId(submission, SUBMISSION_ID);
            GradingResult result = buildGradingResult(submission);
            String reason = "Partial credit for method";

            when(gradeAuditLogRepository.save(any(GradeAuditLog.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            auditLogService.logTeacherOverride(result, PREV_FINAL_SCORE, reason);

            ArgumentCaptor<GradeAuditLog> captor = forClass(GradeAuditLog.class);
            verify(gradeAuditLogRepository).save(captor.capture());

            GradeAuditLog saved = captor.getValue();
            assertThat(saved.getEventType()).isEqualTo(AuditEventType.TEACHER_OVERRIDE);
            assertThat(saved.getSubmissionId()).isEqualTo(SUBMISSION_ID);
            assertThat(saved.getStudentId()).isEqualTo(STUDENT_ID);
            assertThat(saved.getOriginalAiScore()).isEqualByComparingTo(AI_SCORE);
            assertThat(saved.getTeacherModifiedScore()).isEqualByComparingTo(FINAL_SCORE);
            assertThat(saved.getOverrideReason()).isEqualTo(reason);
            assertThat(saved.getReviewerId()).isEqualTo(REVIEWER_ID);
            assertThat(saved.getGradingResultGradeId()).isEqualTo(GRADE_ID);
        }

        @Test
        @DisplayName("accepts null overrideReason without throwing")
        void testLogTeacherOverride_nullReason_savesNullOverrideReason() {
            StudentSubmission submission = buildSubmission(STUDENT_ID, true);
            setId(submission, SUBMISSION_ID);
            GradingResult result = buildGradingResult(submission);

            when(gradeAuditLogRepository.save(any(GradeAuditLog.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            assertDoesNotThrow(() -> auditLogService.logTeacherOverride(result, PREV_FINAL_SCORE, null));

            ArgumentCaptor<GradeAuditLog> captor = forClass(GradeAuditLog.class);
            verify(gradeAuditLogRepository).save(captor.capture());
            assertThat(captor.getValue().getOverrideReason()).isNull();
        }

        @Test
        @DisplayName("swallows RuntimeException thrown by repository — does not propagate")
        void testLogTeacherOverride_repositoryException_doesNotPropagate() {
            StudentSubmission submission = buildSubmission(STUDENT_ID, true);
            setId(submission, SUBMISSION_ID);
            GradingResult result = buildGradingResult(submission);

            doThrow(new RuntimeException("DB unavailable"))
                    .when(gradeAuditLogRepository).save(any(GradeAuditLog.class));

            assertDoesNotThrow(() ->
                    auditLogService.logTeacherOverride(result, PREV_FINAL_SCORE, "reason"));
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // Query dispatch branch tests
    // ════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("queryAuditLogs — dispatch branches")
    class QueryAuditLogs {

        @Test
        @DisplayName("both studentId and date range → calls findByStudentIdAndCreatedAtBetween")
        void testQueryAuditLogs_bothFilters() {
            when(gradeAuditLogRepository.findByStudentIdAndCreatedAtBetween(STUDENT_ID, FROM, TO))
                    .thenReturn(Collections.emptyList());

            List<GradeAuditLogResponse> result = auditLogService.queryAuditLogs(STUDENT_ID, FROM, TO);

            verify(gradeAuditLogRepository).findByStudentIdAndCreatedAtBetween(STUDENT_ID, FROM, TO);
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("studentId only → calls findByStudentId")
        void testQueryAuditLogs_studentIdOnly() {
            when(gradeAuditLogRepository.findByStudentId(STUDENT_ID))
                    .thenReturn(Collections.emptyList());

            List<GradeAuditLogResponse> result = auditLogService.queryAuditLogs(STUDENT_ID, null, null);

            verify(gradeAuditLogRepository).findByStudentId(STUDENT_ID);
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("date range only → calls findByCreatedAtBetween")
        void testQueryAuditLogs_dateRangeOnly() {
            when(gradeAuditLogRepository.findByCreatedAtBetween(FROM, TO))
                    .thenReturn(Collections.emptyList());

            List<GradeAuditLogResponse> result = auditLogService.queryAuditLogs(null, FROM, TO);

            verify(gradeAuditLogRepository).findByCreatedAtBetween(FROM, TO);
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("no filters → calls findAll (EC-4: return everything)")
        void testQueryAuditLogs_noFilters() {
            when(gradeAuditLogRepository.findAll())
                    .thenReturn(Collections.emptyList());

            List<GradeAuditLogResponse> result = auditLogService.queryAuditLogs(null, null, null);

            verify(gradeAuditLogRepository).findAll();
            assertThat(result).isEmpty();
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // Edge cases EC-8 and EC-9
    // ════════════════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("Edge cases")
    class EdgeCases {

        @Test
        @DisplayName("EC-8: null studentId on submission is stored as null without NPE (logAiGradingSuccess)")
        void testLogAiGradingSuccess_nullStudentId_storesNullWithoutNpe() {
            // studentId = null on the submission
            StudentSubmission submission = buildSubmission(null, true);
            setId(submission, SUBMISSION_ID);
            GradingResult result = buildGradingResult(submission);

            when(gradeAuditLogRepository.save(any(GradeAuditLog.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            assertDoesNotThrow(() -> auditLogService.logAiGradingSuccess(result));

            ArgumentCaptor<GradeAuditLog> captor = forClass(GradeAuditLog.class);
            verify(gradeAuditLogRepository).save(captor.capture());
            assertThat(captor.getValue().getStudentId()).isNull();
        }

        @Test
        @DisplayName("EC-8: null studentId on submission is stored as null without NPE (logAiGradingFailure)")
        void testLogAiGradingFailure_nullStudentId_storesNullWithoutNpe() {
            StudentSubmission submission = buildSubmission(null, true);
            setId(submission, SUBMISSION_ID);

            when(gradeAuditLogRepository.save(any(GradeAuditLog.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            assertDoesNotThrow(() -> auditLogService.logAiGradingFailure(submission));

            ArgumentCaptor<GradeAuditLog> captor = forClass(GradeAuditLog.class);
            verify(gradeAuditLogRepository).save(captor.capture());
            assertThat(captor.getValue().getStudentId()).isNull();
        }

        @Test
        @DisplayName("EC-9: null examTemplate on submission stores null examTemplateId without NPE")
        void testLogAiGradingSuccess_nullExamTemplate_storesNullExamTemplateId() {
            // withTemplate = false → examTemplate is null
            StudentSubmission submission = buildSubmission(STUDENT_ID, false);
            setId(submission, SUBMISSION_ID);
            GradingResult result = buildGradingResult(submission);

            when(gradeAuditLogRepository.save(any(GradeAuditLog.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            assertDoesNotThrow(() -> auditLogService.logAiGradingSuccess(result));

            ArgumentCaptor<GradeAuditLog> captor = forClass(GradeAuditLog.class);
            verify(gradeAuditLogRepository).save(captor.capture());
            assertThat(captor.getValue().getExamTemplateId()).isNull();
        }
    }
}
