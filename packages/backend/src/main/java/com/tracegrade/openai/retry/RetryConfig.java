package com.tracegrade.openai.retry;

/**
 * Immutable retry configuration passed into the withRetry() helper.
 * Kept as a record so it can be constructed directly in tests without Spring context.
 */
public record RetryConfig(int maxRetries, long baseDelayMs) {

    public static RetryConfig from(int maxRetries, long baseDelayMs) {
        return new RetryConfig(maxRetries, baseDelayMs);
    }
}
