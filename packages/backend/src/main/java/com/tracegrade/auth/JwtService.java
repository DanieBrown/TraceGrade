package com.tracegrade.auth;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Service;

import com.tracegrade.config.JwtProperties;

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
     * Generates a signed JWT for the given user ID.
     *
     * @param userId the user's UUID
     * @param email  the user's email (stored as subject)
     * @return signed JWT string
     */
    public String generateToken(UUID userId, String email) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtProperties.getExpirationSeconds() * 1000L);

        return Jwts.builder()
                .subject(email)
                .claim("userId", userId.toString())
                .issuer(jwtProperties.getIssuer())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(getSigningKey())
                .compact();
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
