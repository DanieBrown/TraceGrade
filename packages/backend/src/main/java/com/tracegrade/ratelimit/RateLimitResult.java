package com.tracegrade.ratelimit;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Represents the result of a rate limit check.
 */
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class RateLimitResult {

    private final boolean allowed;
    private final long limit;
    private final long remaining;
    private final long retryAfterSeconds;

    public static RateLimitResult allowed(long limit, long remaining) {
        return new RateLimitResult(true, limit, remaining, 0);
    }

    public static RateLimitResult blocked(long limit, long retryAfterSeconds) {
        return new RateLimitResult(false, limit, 0, retryAfterSeconds);
    }
}
