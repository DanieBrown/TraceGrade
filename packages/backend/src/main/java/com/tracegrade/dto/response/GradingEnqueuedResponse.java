package com.tracegrade.dto.response;

import java.time.Instant;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Response returned after requesting AI grading for a submission")
public class GradingEnqueuedResponse {

    @Schema(description = "UUID of the submission this grading job is for")
    private UUID submissionId;

    /**
     * Current status of the grading request:
     * <ul>
     *   <li>{@code QUEUED} – job published to SQS; async processing pending</li>
     *   <li>{@code COMPLETED} – graded synchronously (SQS not configured)</li>
     *   <li>{@code ALREADY_GRADED} – a result already existed; no new job enqueued</li>
     * </ul>
     */
    @Schema(description = "Grading job status: QUEUED (async), COMPLETED (sync), or ALREADY_GRADED",
            example = "QUEUED", allowableValues = {"QUEUED", "COMPLETED", "ALREADY_GRADED"})
    private String status;

    @Schema(description = "UTC timestamp when the enqueue request was processed")
    private Instant enqueuedAt;
}
