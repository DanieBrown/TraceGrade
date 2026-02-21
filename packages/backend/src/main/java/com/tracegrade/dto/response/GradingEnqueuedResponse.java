package com.tracegrade.dto.response;

import java.time.Instant;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradingEnqueuedResponse {

    /** The submission this grading job is for. */
    private UUID submissionId;

    /**
     * Current status of the grading request:
     * <ul>
     *   <li>{@code QUEUED} – job published to SQS; async processing pending</li>
     *   <li>{@code COMPLETED} – graded synchronously (SQS not configured)</li>
     *   <li>{@code ALREADY_GRADED} – a result already existed; no new job enqueued</li>
     * </ul>
     */
    private String status;

    /** Timestamp when the enqueue request was processed. */
    private Instant enqueuedAt;
}
