package com.tracegrade.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Data;

@Data
@Component
@ConfigurationProperties(prefix = "csrf")
public class CsrfProperties {

    /** Whether CSRF protection is enabled. Default: true. */
    private boolean enabled = true;

    /** Name of the CSRF cookie sent to the browser. */
    private String cookieName = "XSRF-TOKEN";

    /** Name of the HTTP header the frontend sends the token in. */
    private String headerName = "X-XSRF-TOKEN";

    /** Cookie path. */
    private String cookiePath = "/";

    /** Whether the cookie should be marked as Secure (HTTPS only). */
    private boolean cookieSecure = true;

    /** SameSite attribute for the CSRF cookie. */
    private String sameSite = "Strict";
}
