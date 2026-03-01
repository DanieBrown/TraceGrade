package com.tracegrade.config;

import java.io.IOException;

import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.DeferredCsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.WebUtils;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Eagerly resolves the deferred {@link CsrfToken} so the CSRF cookie is
 * present in every response. Required for SPA frontends where the browser
 * must read the token from a cookie before making state-changing requests.
 *
 * <p>In Spring Security 6.x, CsrfToken loading is deferred by default.
 * Without this filter the XSRF-TOKEN cookie would not appear until the
 * first POST/PUT/DELETE, which is too late for an SPA.</p>
 *
 * <p>When no CSRF cookie exists in the request and the deferred token was
 * loaded (not generated), this filter explicitly calls
 * {@link CsrfTokenRepository#saveToken} so the cookie is always written to
 * the response — even in test environments where the active
 * {@link CsrfTokenRepository} has been swapped out by the test framework.</p>
 *
 * <p>This filter is NOT a {@code @Component} — it is registered into the
 * Spring Security filter chain via {@code addFilterAfter} in
 * {@link SecurityConfig}.</p>
 */
public class CsrfCookieFilter extends OncePerRequestFilter {

    private final CsrfTokenRepository csrfTokenRepository;
    private final String cookieName;

    CsrfCookieFilter(CsrfTokenRepository csrfTokenRepository, String cookieName) {
        this.csrfTokenRepository = csrfTokenRepository;
        this.cookieName = cookieName;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
        DeferredCsrfToken deferredCsrfToken = (DeferredCsrfToken) request
                .getAttribute(DeferredCsrfToken.class.getName());
        if (deferredCsrfToken != null && WebUtils.getCookie(request, cookieName) == null) {
            CsrfToken csrfToken = deferredCsrfToken.get();
            // If the underlying repository is not CookieCsrfTokenRepository (e.g. because
            // Spring Security Test swapped in HttpSessionCsrfTokenRepository via .with(csrf())),
            // the token is stored in the session but no cookie is written. Explicitly write
            // the cookie here so the SPA always receives it regardless of the active repo.
            if (csrfToken != null) {
                csrfTokenRepository.saveToken(csrfToken, request, response);
            }
        }
        filterChain.doFilter(request, response);
    }
}
