package com.tracegrade.config;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

/**
 * Development-only filter that injects a synthetic authenticated principal
 * into every request so that {@code .authenticated()} and school-scoped
 * authorization checks pass without a real JWT / OAuth provider.
 *
 * <p><strong>This filter is active only when the {@code dev} or {@code docker}
 * profile is enabled.</strong> In production profiles it is never registered.</p>
 *
 * <p>An additional safeguard checks at startup that HTTPS redirect is disabled
 * (i.e. we are in a genuine local environment). If HTTPS redirect is enabled,
 * the application will refuse to start.</p>
 */
@Slf4j
@Component
@Profile({"dev", "docker"})
public class DevAuthenticationFilter extends OncePerRequestFilter {

    /** Must match the seeded demo school in V7__seed_demo_school.sql. */
    static final String DEV_SCHOOL_ID = "00000000-0000-4000-a000-000000000001";

    /** Stable teacher UUID used when no real authentication is present. */
    static final UUID DEV_TEACHER_ID = UUID.fromString("00000000-0000-4000-a000-000000000002");

    @Value("${security-headers.https-redirect-enabled:false}")
    private boolean httpsRedirectEnabled;

    private boolean logged = false;

    /**
     * Safeguard: refuse to start if this filter is accidentally activated in
     * a production-like environment (detectable by HTTPS redirect being enabled).
     */
    @PostConstruct
    void validateEnvironment() {
        if (httpsRedirectEnabled) {
            throw new IllegalStateException(
                    "DevAuthenticationFilter is active but HTTPS redirect is enabled. "
                    + "This filter MUST NOT run in production. "
                    + "Check SPRING_PROFILES_ACTIVE — remove 'dev' and 'docker' profiles.");
        }
        log.warn("DevAuthenticationFilter is ACTIVE — all requests will be auto-authenticated. "
                 + "This MUST NOT be used in production.");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(
                            DEV_TEACHER_ID,          // principal — extractTeacherId sees UUID
                            null,                    // credentials (not needed)
                            List.of(
                                    new SimpleGrantedAuthority("SCHOOL_" + DEV_SCHOOL_ID),
                                    new SimpleGrantedAuthority("ROLE_TEACHER")
                            )
                    );
            // Set the name to the school UUID so authorizeDashboardSchoolAccess
            // can match it via authentication.getName().
            auth.setDetails(DEV_SCHOOL_ID);
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Skip public endpoints that don't need auth
        return path.startsWith("/actuator")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs")
                || path.equals("/api/csrf/token");
    }
}
