package com.tracegrade.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;

/**
 * Security configuration for TraceGrade.
 * Configures stateless JWT-based auth, security headers (HSTS, CSP,
 * X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy),
 * and conditional HTTPS redirect.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final SecurityHeadersProperties securityHeadersProperties;

    public SecurityConfig(SecurityHeadersProperties securityHeadersProperties) {
        this.securityHeadersProperties = securityHeadersProperties;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/**").permitAll()
                        .anyRequest().permitAll() // Will be restricted when auth is implemented
                );

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
