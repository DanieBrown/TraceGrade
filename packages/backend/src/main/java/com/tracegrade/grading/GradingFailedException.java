package com.tracegrade.grading;

import java.util.UUID;

public class GradingFailedException extends RuntimeException {

    private final UUID submissionId;

    public GradingFailedException(UUID submissionId, Throwable cause) {
        super("Grading failed for submission: " + submissionId
                + ". Result has been flagged for manual review.", cause);
        this.submissionId = submissionId;
    }

    public UUID getSubmissionId() {
        return submissionId;
    }
}
