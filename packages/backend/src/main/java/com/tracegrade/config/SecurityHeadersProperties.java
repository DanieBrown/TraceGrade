package com.tracegrade.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Data;

@Data
@Component
@ConfigurationProperties(prefix = "security-headers")
public class SecurityHeadersProperties {

    /** Whether to redirect HTTP requests to HTTPS. False for local dev, true for production. */
    private boolean httpsRedirectEnabled = true;

    /** HSTS max-age in seconds. Default: 31536000 (1 year). */
    private long hstsMaxAgeSeconds = 31536000;

    /** Content-Security-Policy header value. Tuned for a React SPA with Tailwind CSS. */
    private String contentSecurityPolicy =
            "default-src 'self'; "
            + "script-src 'self'; "
            + "style-src 'self' 'unsafe-inline'; "
            + "img-src 'self' data: blob:; "
            + "font-src 'self' data:; "
            + "connect-src 'self'; "
            + "frame-ancestors 'self'; "
            + "base-uri 'self'; "
            + "form-action 'self'";

    /** Permissions-Policy header value. Disables unused browser features. */
    private String permissionsPolicy =
            "camera=(), microphone=(), geolocation=(), payment=()";
}
