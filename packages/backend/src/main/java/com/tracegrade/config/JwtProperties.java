package com.tracegrade.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Data;

@Data
@Component
@ConfigurationProperties(prefix = "jwt")
public class JwtProperties {

    /** JWT signing secret (Base64-encoded or raw string). */
    private String secret = "default-dev-secret-that-must-be-changed-in-production-min-32-chars";

    /** Token expiry in seconds. Default: 24 hours. */
    private long expirationSeconds = 86400L;

    /** Token issuer claim value. */
    private String issuer = "tracegrade";
}
