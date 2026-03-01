package com.tracegrade.config;

import java.util.Optional;
import java.util.function.Supplier;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.tracegrade.auth.JwtAuthenticationFilter;
import org.springframework.http.HttpMethod;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.servlet.util.matcher.MvcRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.handler.HandlerMappingIntrospector;

import jakarta.servlet.http.HttpServletResponse;

/**
 * Security configuration for TraceGrade.
 * Configures stateless JWT-based auth, CSRF protection (double-submit cookie),
 * security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options,
 * Referrer-Policy, Permissions-Policy), and conditional HTTPS redirect.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final SecurityHeadersProperties securityHeadersProperties;
    private final CsrfProperties csrfProperties;
    private final CsrfAccessDeniedHandler csrfAccessDeniedHandler;
    private final CorsProperties corsProperties;

    /** Present only when the {@code dev} profile is active. */
    private final Optional<DevAuthenticationFilter> devAuthenticationFilter;

    /** Present only when the {@code dev} and {@code docker} profiles are NOT active. */
    private final Optional<JwtAuthenticationFilter> jwtAuthenticationFilter;

    public SecurityConfig(SecurityHeadersProperties securityHeadersProperties,
                          CsrfProperties csrfProperties,
                          CsrfAccessDeniedHandler csrfAccessDeniedHandler,
                          CorsProperties corsProperties,
                          @Autowired(required = false) DevAuthenticationFilter devAuthenticationFilter,
                          @Autowired(required = false) JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.securityHeadersProperties = securityHeadersProperties;
        this.csrfProperties = csrfProperties;
        this.csrfAccessDeniedHandler = csrfAccessDeniedHandler;
        this.corsProperties = corsProperties;
        this.devAuthenticationFilter = Optional.ofNullable(devAuthenticationFilter);
        this.jwtAuthenticationFilter = Optional.ofNullable(jwtAuthenticationFilter);
    }

    @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                                                                   HandlerMappingIntrospector introspector) throws Exception {
                MvcRequestMatcher dashboardStatsMatcher = new MvcRequestMatcher(
                                introspector, "/api/schools/{schoolId}/dashboard/stats");
                dashboardStatsMatcher.setMethod(HttpMethod.GET);

                // Enrollment collection: GET (list) and POST (enroll) -- no HTTP method filter
                MvcRequestMatcher enrollmentCollectionMatcher = new MvcRequestMatcher(
                                introspector, "/api/schools/{schoolId}/classes/{classId}/enrollments");

                // Enrollment item: DELETE (drop) -- no HTTP method filter
                MvcRequestMatcher enrollmentItemMatcher = new MvcRequestMatcher(
                                introspector, "/api/schools/{schoolId}/classes/{classId}/enrollments/{enrollmentId}");

                // Grade category collection: GET (list) and POST (create)
                MvcRequestMatcher gradeCategoryCollectionMatcher = new MvcRequestMatcher(
                                introspector, "/api/schools/{schoolId}/classes/{classId}/categories");

                // Grade category item: PUT (update) and DELETE
                MvcRequestMatcher gradeCategoryItemMatcher = new MvcRequestMatcher(
                                introspector, "/api/schools/{schoolId}/classes/{classId}/categories/{categoryId}");

                // Assignment collection: GET (list) and POST (create)
                MvcRequestMatcher assignmentCollectionMatcher = new MvcRequestMatcher(
                                introspector, "/api/schools/{schoolId}/classes/{classId}/assignments");

                // Assignment item: GET (single), PUT (update) and DELETE
                MvcRequestMatcher assignmentItemMatcher = new MvcRequestMatcher(
                                introspector, "/api/schools/{schoolId}/classes/{classId}/assignments/{assignmentId}");

        // CORS must be configured first so preflight OPTIONS requests
        // get proper headers before any other filter can reject them.
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()));

        // CSRF protection
        if (csrfProperties.isEnabled()) {
            CookieCsrfTokenRepository tokenRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
            tokenRepository.setCookieName(csrfProperties.getCookieName());
            tokenRepository.setHeaderName(csrfProperties.getHeaderName());
            tokenRepository.setCookiePath(csrfProperties.getCookiePath());
            tokenRepository.setCookieCustomizer(cookie -> {
                cookie.secure(csrfProperties.isCookieSecure());
                cookie.sameSite(csrfProperties.getSameSite());
            });

            // Use plain CsrfTokenRequestAttributeHandler so the frontend can
            // send the raw cookie value in the header without XOR encoding.
            CsrfTokenRequestAttributeHandler requestHandler = new CsrfTokenRequestAttributeHandler();
            requestHandler.setCsrfRequestAttributeName(null); // opt out of deferred loading

            http.csrf(csrf -> csrf
                    .csrfTokenRepository(tokenRepository)
                    .csrfTokenRequestHandler(requestHandler)
                    .ignoringRequestMatchers("/actuator/**", "/swagger-ui/**", "/v3/api-docs/**")
            );

            // Eagerly load deferred CSRF token so the cookie is set on every response
            http.addFilterAfter(new CsrfCookieFilter(tokenRepository, csrfProperties.getCookieName()), BasicAuthenticationFilter.class);
        } else {
            http.csrf(csrf -> csrf.disable());
        }

        http
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints — no authentication required
                        .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/api/csrf/token").permitAll()
                        .requestMatchers("/api/auth/register", "/api/auth/login").permitAll()
                        // Protected endpoints with custom authorization
                        .requestMatchers("/api/exam-templates/**").authenticated()
                        .requestMatchers(dashboardStatsMatcher).access(this::authorizeDashboardSchoolAccess)
                        .requestMatchers(enrollmentCollectionMatcher).access(this::authorizeDashboardSchoolAccess)
                        .requestMatchers(enrollmentItemMatcher).access(this::authorizeDashboardSchoolAccess)
                        .requestMatchers(gradeCategoryCollectionMatcher).access(this::authorizeDashboardSchoolAccess)
                        .requestMatchers(gradeCategoryItemMatcher).access(this::authorizeDashboardSchoolAccess)
                        .requestMatchers(assignmentCollectionMatcher).access(this::authorizeDashboardSchoolAccess)
                        .requestMatchers(assignmentItemMatcher).access(this::authorizeDashboardSchoolAccess)
                        // All other actuator endpoints require authentication
                        .requestMatchers("/actuator/**").authenticated()
                        // Default: deny unauthenticated access (fail-closed)
                        .anyRequest().authenticated()
                )
                .exceptionHandling(ex -> ex
                        .accessDeniedHandler(csrfAccessDeniedHandler)
                        .authenticationEntryPoint((request, response, authException) ->
                                response.sendError(HttpServletResponse.SC_UNAUTHORIZED)));

        // In dev profile, inject synthetic auth before the security filter runs
        devAuthenticationFilter.ifPresent(filter ->
                http.addFilterBefore(filter, UsernamePasswordAuthenticationFilter.class));

        // In non-dev profiles, inject JWT authentication before the security filter runs
        jwtAuthenticationFilter.ifPresent(filter ->
                http.addFilterBefore(filter, UsernamePasswordAuthenticationFilter.class));

        // Security headers
        http.headers(headers -> headers
                .httpStrictTransportSecurity(hsts -> hsts
                        .includeSubDomains(true)
                        .maxAgeInSeconds(securityHeadersProperties.getHstsMaxAgeSeconds())
                        .preload(true))
                .frameOptions(frame -> frame.sameOrigin())
                .contentTypeOptions(Customizer.withDefaults())
                .contentSecurityPolicy(csp -> csp
                        .policyDirectives(securityHeadersProperties.getContentSecurityPolicy()))
                .referrerPolicy(referrer -> referrer
                        .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                .permissionsPolicy(permissions -> permissions
                        .policy(securityHeadersProperties.getPermissionsPolicy()))
        );

        // Conditional HTTPS redirect (disabled for local dev, enabled for production)
        if (securityHeadersProperties.isHttpsRedirectEnabled()) {
            http.requiresChannel(channel -> channel
                    .anyRequest().requiresSecure());
        }

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(corsProperties.getAllowedOrigins());
        configuration.setAllowedMethods(corsProperties.getAllowedMethods());
        configuration.setAllowedHeaders(corsProperties.getAllowedHeaders());
        configuration.setAllowCredentials(corsProperties.isAllowCredentials());
        configuration.setMaxAge(corsProperties.getMaxAge());

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }

        private AuthorizationDecision authorizeDashboardSchoolAccess(
                        Supplier<Authentication> authenticationSupplier,
                        RequestAuthorizationContext context) {
                Authentication authentication = authenticationSupplier.get();
                if (authentication == null || !authentication.isAuthenticated()
                                || authentication instanceof org.springframework.security.authentication.AnonymousAuthenticationToken) {
                        return new AuthorizationDecision(false);
                }

                String requestedSchoolId = context.getVariables().get("schoolId");
                if (requestedSchoolId == null || requestedSchoolId.isBlank()) {
                        return new AuthorizationDecision(false);
                }

                if (!isValidUuid(requestedSchoolId)) {
                        // Fail closed: deny access for malformed identifiers
                        return new AuthorizationDecision(false);
                }

                if (requestedSchoolId.equals(authentication.getName())) {
                        return new AuthorizationDecision(true);
                }

                boolean hasMatchingSchoolAuthority = authentication.getAuthorities().stream()
                                .map(GrantedAuthority::getAuthority)
                                .anyMatch(authority -> authority.equals("SCHOOL_" + requestedSchoolId)
                                                || authority.equals("SCHOOL:" + requestedSchoolId));

                return new AuthorizationDecision(hasMatchingSchoolAuthority);
        }

        private boolean isValidUuid(String value) {
                try {
                        UUID.fromString(value);
                        return true;
                } catch (IllegalArgumentException ex) {
                        return false;
                }
        }
}
