package com.tracegrade.ratelimit;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Data;

@Data
@Component
@ConfigurationProperties(prefix = "rate-limit")
public class RateLimitProperties {

    private boolean enabled = true;

    /** Default API rate limit: requests per window */
    private int apiLimit = 100;

    /** Default API rate limit window in seconds */
    private int apiWindowSeconds = 60;

    /** File upload rate limit: requests per window */
    private int uploadLimit = 10;

    /** File upload rate limit window in seconds */
    private int uploadWindowSeconds = 3600;

    /** OpenAI API rate limit: requests per window */
    private int aiLimit = 50;

    /** OpenAI AI rate limit window in seconds */
    private int aiWindowSeconds = 3600;
}
