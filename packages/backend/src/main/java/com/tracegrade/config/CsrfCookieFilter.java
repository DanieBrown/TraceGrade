package com.tracegrade.config;

import java.io.IOException;

import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;

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
 * <p>This filter is NOT a {@code @Component} — it is registered into the
 * Spring Security filter chain via {@code addFilterAfter} in
 * {@link SecurityConfig}.</p>
 */
public class CsrfCookieFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
        CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        if (csrfToken != null) {
            // Force the deferred token to load, which causes
            // CookieCsrfTokenRepository to write the cookie.
            csrfToken.getToken();
        }
        filterChain.doFilter(request, response);
    }
}
