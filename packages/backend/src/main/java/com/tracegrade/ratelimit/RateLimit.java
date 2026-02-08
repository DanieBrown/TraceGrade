package com.tracegrade.ratelimit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to apply rate limiting to controller methods or classes.
 * When applied to a class, all handler methods inherit the rate limit plan.
 * Method-level annotations override class-level ones.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
    RateLimitPlan value() default RateLimitPlan.API;
}
