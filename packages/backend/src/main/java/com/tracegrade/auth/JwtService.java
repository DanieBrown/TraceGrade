package com.tracegrade.auth;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Service;

import com.tracegrade.config.JwtProperties;
import com.tracegrade.domain.model.User;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for generating and validating JWT tokens.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtProperties jwtProperties;

    /**
     * Generates a signed JWT for the authenticated user.
     *
     * <p>The token includes enough identity claims for the frontend to render the
     * signed-in teacher consistently after login/register without a separate
     * profile fetch.
     */
    public String generateToken(User user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtProperties.getExpirationSeconds() * 1000L);

        var builder = Jwts.builder()
                .subject(user.getEmail())
                .issuer(jwtProperties.getIssuer())
                .issuedAt(now)
                .expiration(expiry);

        UUID userId = user.getId();
        if (userId != null) {
            builder.claim("userId", userId.toString());
        }

        if (user.getFirstName() != null && !user.getFirstName().isBlank()) {
            builder.claim("firstName", user.getFirstName());
        }

        if (user.getLastName() != null && !user.getLastName().isBlank()) {
            builder.claim("lastName", user.getLastName());
        }

        if (user.getRole() != null) {
            builder.claim("role", user.getRole().name());
        }

        return builder.signWith(getSigningKey()).compact();
    }

    /**
     * Validates the given JWT and returns its claims.
     *
     * @param token the JWT string
     * @return claims if valid
     * @throws JwtException if the token is invalid or expired
     */
    public Claims validateToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Extracts the user ID from a valid JWT token.
     *
     * @param token the JWT string
     * @return UUID of the user
     */
    public UUID extractUserId(String token) {
        Claims claims = validateToken(token);
        return UUID.fromString(claims.get("userId", String.class));
    }

    /**
     * Extracts the subject (email) from a valid JWT token.
     *
     * @param token the JWT string
     * @return email of the user
     */
    public String extractEmail(String token) {
        return validateToken(token).getSubject();
    }

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
