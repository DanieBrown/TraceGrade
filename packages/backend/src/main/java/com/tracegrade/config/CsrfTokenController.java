package com.tracegrade.config;

import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Lightweight endpoint to ensure a fresh CSRF token cookie is issued.
 * The SPA calls this on initial load or after a CSRF token error.
 * The actual token is delivered via the XSRF-TOKEN cookie (set by
 * {@link CsrfCookieFilter}), not in the response body.
 */
@Hidden
@RestController
public class CsrfTokenController {

    @GetMapping("/api/csrf/token")
    public void csrfToken(CsrfToken csrfToken) {
        // Accessing the CsrfToken parameter triggers the deferred token
        // to load and the cookie to be set. No response body needed.
    }
}
