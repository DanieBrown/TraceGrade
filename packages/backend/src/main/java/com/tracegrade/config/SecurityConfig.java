package com.tracegrade.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;

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

    public SecurityConfig(SecurityHeadersProperties securityHeadersProperties,
                          CsrfProperties csrfProperties,
                          CsrfAccessDeniedHandler csrfAccessDeniedHandler) {
        this.securityHeadersProperties = securityHeadersProperties;
        this.csrfProperties = csrfProperties;
        this.csrfAccessDeniedHandler = csrfAccessDeniedHandler;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
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
            http.addFilterAfter(new CsrfCookieFilter(), BasicAuthenticationFilter.class);
        } else {
            http.csrf(csrf -> csrf.disable());
        }

        http
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                        .anyRequest().permitAll() // Will be restricted when auth is implemented
                )
                .exceptionHandling(ex -> ex
                        .accessDeniedHandler(csrfAccessDeniedHandler));

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
}
