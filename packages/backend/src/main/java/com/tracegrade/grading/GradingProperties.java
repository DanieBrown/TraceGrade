package com.tracegrade.grading;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Data;

@Data
@Component
@ConfigurationProperties(prefix = "grading")
public class GradingProperties {

    /**
     * Confidence threshold below which a grading result is flagged for manual review.
     * Uses the [0.0, 1.0] scale to match GradingResponse.confidenceScore directly.
     * Default: 0.80 (80%).
     */
    private double confidenceThreshold = 0.80;
}
