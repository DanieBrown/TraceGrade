package com.tracegrade.ratelimit;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service that manages rate limiting using Bucket4j token buckets.
 * Buckets are keyed per client+plan and stored in a concurrent map.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RateLimitService {

    private final RateLimitProperties properties;
    private final Map<String, Bucket> bucketCache = new ConcurrentHashMap<>();

    /**
     * Attempts to consume a token for the given client key and rate limit plan.
     *
     * @param clientKey unique identifier for the client (IP or user ID)
     * @param plan      the rate limit plan to apply
     * @return a {@link RateLimitResult} indicating whether the request is allowed
     */
    public RateLimitResult tryConsume(String clientKey, RateLimitPlan plan) {
        if (!properties.isEnabled()) {
            return RateLimitResult.allowed(0, 0);
        }

        String bucketKey = clientKey + ":" + plan.name();
        Bucket bucket = bucketCache.computeIfAbsent(bucketKey, k -> createBucket(plan));

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            long limit = getLimit(plan);
            long remaining = probe.getRemainingTokens();
            log.debug("Rate limit allowed for key={}, plan={}, remaining={}", bucketKey, plan, remaining);
            return RateLimitResult.allowed(limit, remaining);
        } else {
            long limit = getLimit(plan);
            long retryAfterSeconds = Duration.ofNanos(probe.getNanosToWaitForRefill()).toSeconds() + 1;
            log.warn("Rate limit exceeded for key={}, plan={}, retryAfter={}s", bucketKey, plan, retryAfterSeconds);
            return RateLimitResult.blocked(limit, retryAfterSeconds);
        }
    }

    /**
     * Resolves the appropriate rate limit plan for a given request path.
     * Falls back to {@link RateLimitPlan#API} if no specific match.
     */
    public RateLimitPlan resolvePlan(String requestPath) {
        if (requestPath.contains("/upload") || requestPath.contains("/submissions")) {
            return RateLimitPlan.UPLOAD;
        }
        if (requestPath.contains("/ai") || requestPath.contains("/grading")) {
            return RateLimitPlan.AI;
        }
        return RateLimitPlan.API;
    }

    private Bucket createBucket(RateLimitPlan plan) {
        int limit = getLimit(plan);
        int windowSeconds = getWindowSeconds(plan);

        Bandwidth bandwidth = Bandwidth.builder()
                .capacity(limit)
                .refillGreedy(limit, Duration.ofSeconds(windowSeconds))
                .build();

        return Bucket.builder()
                .addLimit(bandwidth)
                .build();
    }

    private int getLimit(RateLimitPlan plan) {
        return switch (plan) {
            case API -> properties.getApiLimit();
            case UPLOAD -> properties.getUploadLimit();
            case AI -> properties.getAiLimit();
        };
    }

    private int getWindowSeconds(RateLimitPlan plan) {
        return switch (plan) {
            case API -> properties.getApiWindowSeconds();
            case UPLOAD -> properties.getUploadWindowSeconds();
            case AI -> properties.getAiWindowSeconds();
        };
    }
}
