package com.tracegrade.monitoring;

import java.util.concurrent.TimeUnit;

import org.springframework.stereotype.Service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;

/**
 * Records operational metrics for the AI grading pipeline via Micrometer.
 *
 * <p>All meters are registered against the injected {@link MeterRegistry}, which
 * Spring Boot Actuator composes with any active export registries (e.g. CloudWatch,
 * Prometheus). Callers are responsible for calling the appropriate record methods
 * at the right points in the grading workflow.
 *
 * <p>Metric catalogue:
 * <ul>
 *   <li>{@code grading.jobs.completed[outcome=success|failure]} — counter</li>
 *   <li>{@code grading.processing.time} — timer (ms per job)</li>
 *   <li>{@code grading.confidence.score} — distribution summary (0–100 %)</li>
 *   <li>{@code grading.reviews.flagged} — counter (jobs that need manual review)</li>
 *   <li>{@code grading.jobs.enqueued} — counter</li>
 *   <li>{@code openai.api.calls[outcome=success|failure]} — counter</li>
 *   <li>{@code sqs.poll.errors} — counter</li>
 * </ul>
 */
@Service
public class GradingMetricsService {

    static final String GRADING_JOBS_COMPLETED  = "grading.jobs.completed";
    static final String GRADING_PROCESSING_TIME = "grading.processing.time";
    static final String GRADING_CONFIDENCE      = "grading.confidence.score";
    static final String GRADING_REVIEWS_FLAGGED = "grading.reviews.flagged";
    static final String GRADING_JOBS_ENQUEUED   = "grading.jobs.enqueued";
    static final String OPENAI_API_CALLS        = "openai.api.calls";
    static final String SQS_POLL_ERRORS         = "sqs.poll.errors";
    static final String TAG_OUTCOME             = "outcome";

    private final MeterRegistry registry;

    public GradingMetricsService(MeterRegistry registry) {
        this.registry = registry;
    }

    /**
     * Records a successfully completed grading job.
     *
     * @param processingTimeMs wall-clock time the job took in milliseconds
     * @param confidenceScore  average AI confidence (0–100 %)
     * @param needsReview      whether the result was flagged for manual review
     */
    public void recordGradingSuccess(long processingTimeMs, double confidenceScore, boolean needsReview) {
        Counter.builder(GRADING_JOBS_COMPLETED)
                .tag(TAG_OUTCOME, "success")
                .register(registry)
                .increment();

        Timer.builder(GRADING_PROCESSING_TIME)
                .register(registry)
                .record(processingTimeMs, TimeUnit.MILLISECONDS);

        DistributionSummary.builder(GRADING_CONFIDENCE)
                .baseUnit("percent")
                .register(registry)
                .record(confidenceScore);

        if (needsReview) {
            Counter.builder(GRADING_REVIEWS_FLAGGED)
                    .register(registry)
                    .increment();
        }
    }

    /** Records a grading job that failed due to an AI service error. */
    public void recordGradingFailure() {
        Counter.builder(GRADING_JOBS_COMPLETED)
                .tag(TAG_OUTCOME, "failure")
                .register(registry)
                .increment();
    }

    /** Records a grading job being placed on the SQS queue. */
    public void recordJobEnqueued() {
        Counter.builder(GRADING_JOBS_ENQUEUED)
                .register(registry)
                .increment();
    }

    /** Records a successful OpenAI API call. */
    public void recordOpenAiSuccess() {
        Counter.builder(OPENAI_API_CALLS)
                .tag(TAG_OUTCOME, "success")
                .register(registry)
                .increment();
    }

    /** Records a failed OpenAI API call. */
    public void recordOpenAiFailure() {
        Counter.builder(OPENAI_API_CALLS)
                .tag(TAG_OUTCOME, "failure")
                .register(registry)
                .increment();
    }

    /** Records a failure to receive messages from SQS. */
    public void recordSqsPollError() {
        Counter.builder(SQS_POLL_ERRORS)
                .register(registry)
                .increment();
    }
}
