package com.tracegrade.ratelimit;

/**
 * Defines the different rate limit tiers applied to API endpoints.
 */
public enum RateLimitPlan {
    /** General API endpoints: 100 req/min */
    API,
    /** File upload endpoints: 10 req/hour */
    UPLOAD,
    /** AI/OpenAI endpoints: 50 req/hour */
    AI
}
