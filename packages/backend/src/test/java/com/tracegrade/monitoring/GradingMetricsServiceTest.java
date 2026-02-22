package com.tracegrade.monitoring;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

class GradingMetricsServiceTest {

    private SimpleMeterRegistry registry;
    private GradingMetricsService service;

    @BeforeEach
    void setUp() {
        registry = new SimpleMeterRegistry();
        service  = new GradingMetricsService(registry);
    }

    // -------------------------------------------------------------------------
    // recordGradingSuccess
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("recordGradingSuccess")
    class RecordGradingSuccessTests {

        @Test
        @DisplayName("increments grading.jobs.completed[outcome=success]")
        void incrementsSuccessCounter() {
            service.recordGradingSuccess(1000L, 90.0, false);

            assertThat(registry.counter(GradingMetricsService.GRADING_JOBS_COMPLETED,
                    GradingMetricsService.TAG_OUTCOME, "success").count())
                    .isEqualTo(1.0);
        }

        @Test
        @DisplayName("records grading.processing.time timer with one observation")
        void recordsProcessingTimeTimer() {
            service.recordGradingSuccess(500L, 90.0, false);

            assertThat(registry.timer(GradingMetricsService.GRADING_PROCESSING_TIME).count())
                    .isEqualTo(1);
        }

        @Test
        @DisplayName("records grading.confidence.score distribution summary with one observation")
        void recordsConfidenceScoreSummary() {
            service.recordGradingSuccess(1000L, 85.5, false);

            assertThat(registry.summary(GradingMetricsService.GRADING_CONFIDENCE).count())
                    .isEqualTo(1);
            assertThat(registry.summary(GradingMetricsService.GRADING_CONFIDENCE).mean())
                    .isEqualTo(85.5);
        }

        @Test
        @DisplayName("increments grading.reviews.flagged when needsReview=true")
        void incrementsReviewsFlaggedWhenNeeded() {
            service.recordGradingSuccess(1000L, 70.0, true);

            assertThat(registry.counter(GradingMetricsService.GRADING_REVIEWS_FLAGGED).count())
                    .isEqualTo(1.0);
        }

        @Test
        @DisplayName("does not register grading.reviews.flagged when needsReview=false")
        void doesNotRegisterReviewsFlaggedWhenNotNeeded() {
            service.recordGradingSuccess(1000L, 95.0, false);

            assertThat(registry.find(GradingMetricsService.GRADING_REVIEWS_FLAGGED).counter())
                    .isNull();
        }

        @Test
        @DisplayName("accumulates counts across multiple calls")
        void accumulatesAcrossMultipleCalls() {
            service.recordGradingSuccess(500L, 90.0, false);
            service.recordGradingSuccess(800L, 85.0, true);

            assertThat(registry.counter(GradingMetricsService.GRADING_JOBS_COMPLETED,
                    GradingMetricsService.TAG_OUTCOME, "success").count())
                    .isEqualTo(2.0);
            assertThat(registry.timer(GradingMetricsService.GRADING_PROCESSING_TIME).count())
                    .isEqualTo(2);
        }
    }

    // -------------------------------------------------------------------------
    // recordGradingFailure
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("recordGradingFailure")
    class RecordGradingFailureTests {

        @Test
        @DisplayName("increments grading.jobs.completed[outcome=failure]")
        void incrementsFailureCounter() {
            service.recordGradingFailure();

            assertThat(registry.counter(GradingMetricsService.GRADING_JOBS_COMPLETED,
                    GradingMetricsService.TAG_OUTCOME, "failure").count())
                    .isEqualTo(1.0);
        }

        @Test
        @DisplayName("does not affect the success counter")
        void doesNotAffectSuccessCounter() {
            service.recordGradingFailure();

            assertThat(registry.find(GradingMetricsService.GRADING_JOBS_COMPLETED)
                    .tag(GradingMetricsService.TAG_OUTCOME, "success")
                    .counter())
                    .isNull();
        }
    }

    // -------------------------------------------------------------------------
    // recordJobEnqueued
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("recordJobEnqueued")
    class RecordJobEnqueuedTests {

        @Test
        @DisplayName("increments grading.jobs.enqueued")
        void incrementsEnqueuedCounter() {
            service.recordJobEnqueued();

            assertThat(registry.counter(GradingMetricsService.GRADING_JOBS_ENQUEUED).count())
                    .isEqualTo(1.0);
        }

        @Test
        @DisplayName("accumulates on repeated calls")
        void accumulatesOnRepeatedCalls() {
            service.recordJobEnqueued();
            service.recordJobEnqueued();
            service.recordJobEnqueued();

            assertThat(registry.counter(GradingMetricsService.GRADING_JOBS_ENQUEUED).count())
                    .isEqualTo(3.0);
        }
    }

    // -------------------------------------------------------------------------
    // recordOpenAiSuccess / recordOpenAiFailure
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("recordOpenAiSuccess")
    class RecordOpenAiSuccessTests {

        @Test
        @DisplayName("increments openai.api.calls[outcome=success]")
        void incrementsSuccessCounter() {
            service.recordOpenAiSuccess();

            assertThat(registry.counter(GradingMetricsService.OPENAI_API_CALLS,
                    GradingMetricsService.TAG_OUTCOME, "success").count())
                    .isEqualTo(1.0);
        }
    }

    @Nested
    @DisplayName("recordOpenAiFailure")
    class RecordOpenAiFailureTests {

        @Test
        @DisplayName("increments openai.api.calls[outcome=failure]")
        void incrementsFailureCounter() {
            service.recordOpenAiFailure();

            assertThat(registry.counter(GradingMetricsService.OPENAI_API_CALLS,
                    GradingMetricsService.TAG_OUTCOME, "failure").count())
                    .isEqualTo(1.0);
        }

        @Test
        @DisplayName("does not affect the success counter")
        void doesNotAffectSuccessCounter() {
            service.recordOpenAiFailure();

            assertThat(registry.find(GradingMetricsService.OPENAI_API_CALLS)
                    .tag(GradingMetricsService.TAG_OUTCOME, "success")
                    .counter())
                    .isNull();
        }
    }

    // -------------------------------------------------------------------------
    // recordSqsPollError
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("recordSqsPollError")
    class RecordSqsPollErrorTests {

        @Test
        @DisplayName("increments sqs.poll.errors")
        void incrementsPollErrorsCounter() {
            service.recordSqsPollError();

            assertThat(registry.counter(GradingMetricsService.SQS_POLL_ERRORS).count())
                    .isEqualTo(1.0);
        }

        @Test
        @DisplayName("accumulates on repeated poll failures")
        void accumulatesOnRepeatedFailures() {
            service.recordSqsPollError();
            service.recordSqsPollError();

            assertThat(registry.counter(GradingMetricsService.SQS_POLL_ERRORS).count())
                    .isEqualTo(2.0);
        }
    }
}
