package com.tracegrade.sqs;

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
public class GradingJobMessage {

    /** The submission to be graded. */
    private UUID submissionId;

    /** When the job was placed on the queue. */
    private Instant enqueuedAt;
}
