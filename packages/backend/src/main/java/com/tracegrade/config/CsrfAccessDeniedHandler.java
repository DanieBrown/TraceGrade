package com.tracegrade.config;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.csrf.InvalidCsrfTokenException;
import org.springframework.security.web.csrf.MissingCsrfTokenException;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tracegrade.dto.response.ApiError;
import com.tracegrade.dto.response.ApiResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class CsrfAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    @Override
    public void handle(HttpServletRequest request,
                       HttpServletResponse response,
                       AccessDeniedException accessDeniedException)
            throws IOException {

        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        String errorCode;
        String errorMessage;

        if (accessDeniedException instanceof MissingCsrfTokenException) {
            errorCode = "CSRF_TOKEN_MISSING";
            errorMessage = "CSRF token is missing. Ensure the X-XSRF-TOKEN header is included.";
            log.warn("Missing CSRF token for {} {}", request.getMethod(), request.getRequestURI());
        } else if (accessDeniedException instanceof InvalidCsrfTokenException) {
            errorCode = "CSRF_TOKEN_INVALID";
            errorMessage = "CSRF token is invalid or expired. Please refresh and try again.";
            log.warn("Invalid CSRF token for {} {}", request.getMethod(), request.getRequestURI());
        } else {
            errorCode = "ACCESS_DENIED";
            errorMessage = "Access denied";
            log.warn("Access denied for {} {}: {}", request.getMethod(),
                     request.getRequestURI(), accessDeniedException.getMessage());
        }

        ApiError error = ApiError.of(errorCode, errorMessage);
        ApiResponse<Void> body = ApiResponse.error(error);
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
