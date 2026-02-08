package com.tracegrade.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class RateLimitServiceTest {

    private RateLimitProperties properties;
    private RateLimitService rateLimitService;

    @BeforeEach
    void setUp() {
        properties = new RateLimitProperties();
        properties.setEnabled(true);
        properties.setApiLimit(5);           // low limit for testing
        properties.setApiWindowSeconds(60);
        properties.setUploadLimit(2);
        properties.setUploadWindowSeconds(3600);
        properties.setAiLimit(3);
        properties.setAiWindowSeconds(3600);

        rateLimitService = new RateLimitService(properties);
    }

    @Test
    @DisplayName("Should allow requests within API rate limit")
    void allowRequestsWithinLimit() {
        for (int i = 0; i < 5; i++) {
            RateLimitResult result = rateLimitService.tryConsume("client1", RateLimitPlan.API);
            assertThat(result.isAllowed()).isTrue();
            assertThat(result.getLimit()).isEqualTo(5);
        }
    }

    @Test
    @DisplayName("Should block requests exceeding API rate limit")
    void blockRequestsExceedingLimit() {
        // Exhaust the limit
        for (int i = 0; i < 5; i++) {
            rateLimitService.tryConsume("client2", RateLimitPlan.API);
        }

        // Next request should be blocked
        RateLimitResult result = rateLimitService.tryConsume("client2", RateLimitPlan.API);
        assertThat(result.isAllowed()).isFalse();
        assertThat(result.getLimit()).isEqualTo(5);
        assertThat(result.getRemaining()).isEqualTo(0);
        assertThat(result.getRetryAfterSeconds()).isGreaterThan(0);
    }

    @Test
    @DisplayName("Should track remaining tokens accurately")
    void trackRemainingTokens() {
        RateLimitResult result1 = rateLimitService.tryConsume("client3", RateLimitPlan.API);
        assertThat(result1.getRemaining()).isEqualTo(4);

        RateLimitResult result2 = rateLimitService.tryConsume("client3", RateLimitPlan.API);
        assertThat(result2.getRemaining()).isEqualTo(3);
    }

    @Test
    @DisplayName("Should isolate rate limits per client key")
    void isolatePerClientKey() {
        // Exhaust limit for client A
        for (int i = 0; i < 5; i++) {
            rateLimitService.tryConsume("clientA", RateLimitPlan.API);
        }

        // Client B should still be allowed
        RateLimitResult result = rateLimitService.tryConsume("clientB", RateLimitPlan.API);
        assertThat(result.isAllowed()).isTrue();
    }

    @Test
    @DisplayName("Should apply different limits per plan")
    void applyDifferentLimitsPerPlan() {
        // Upload limit is 2
        RateLimitResult r1 = rateLimitService.tryConsume("client4", RateLimitPlan.UPLOAD);
        assertThat(r1.isAllowed()).isTrue();

        RateLimitResult r2 = rateLimitService.tryConsume("client4", RateLimitPlan.UPLOAD);
        assertThat(r2.isAllowed()).isTrue();

        RateLimitResult r3 = rateLimitService.tryConsume("client4", RateLimitPlan.UPLOAD);
        assertThat(r3.isAllowed()).isFalse();

        // Same client's API limit should be unaffected
        RateLimitResult apiResult = rateLimitService.tryConsume("client4", RateLimitPlan.API);
        assertThat(apiResult.isAllowed()).isTrue();
    }

    @Test
    @DisplayName("Should enforce AI rate limit")
    void enforceAiRateLimit() {
        // AI limit is 3
        for (int i = 0; i < 3; i++) {
            RateLimitResult result = rateLimitService.tryConsume("client5", RateLimitPlan.AI);
            assertThat(result.isAllowed()).isTrue();
        }

        RateLimitResult blocked = rateLimitService.tryConsume("client5", RateLimitPlan.AI);
        assertThat(blocked.isAllowed()).isFalse();
        assertThat(blocked.getLimit()).isEqualTo(3);
    }

    @Test
    @DisplayName("Should allow all requests when rate limiting is disabled")
    void allowAllWhenDisabled() {
        properties.setEnabled(false);

        for (int i = 0; i < 100; i++) {
            RateLimitResult result = rateLimitService.tryConsume("client6", RateLimitPlan.API);
            assertThat(result.isAllowed()).isTrue();
        }
    }

    @Test
    @DisplayName("Should resolve UPLOAD plan for upload paths")
    void resolveUploadPlan() {
        assertThat(rateLimitService.resolvePlan("/api/upload/exam")).isEqualTo(RateLimitPlan.UPLOAD);
        assertThat(rateLimitService.resolvePlan("/api/submissions/123")).isEqualTo(RateLimitPlan.UPLOAD);
    }

    @Test
    @DisplayName("Should resolve AI plan for grading/ai paths")
    void resolveAiPlan() {
        assertThat(rateLimitService.resolvePlan("/api/grading/submit")).isEqualTo(RateLimitPlan.AI);
        assertThat(rateLimitService.resolvePlan("/api/ai/generate")).isEqualTo(RateLimitPlan.AI);
    }

    @Test
    @DisplayName("Should resolve API plan as default")
    void resolveDefaultApiPlan() {
        assertThat(rateLimitService.resolvePlan("/api/classes")).isEqualTo(RateLimitPlan.API);
        assertThat(rateLimitService.resolvePlan("/api/students/1")).isEqualTo(RateLimitPlan.API);
    }
}
