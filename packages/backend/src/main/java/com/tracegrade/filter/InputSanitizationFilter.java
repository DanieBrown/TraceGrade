package com.tracegrade.filter;

import java.io.IOException;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class InputSanitizationFilter extends OncePerRequestFilter {

    private final SanitizationProperties sanitizationProperties;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        if (!sanitizationProperties.isEnabled()) {
            filterChain.doFilter(request, response);
            return;
        }

        // Skip multipart requests -- binary data should not be sanitized as text
        String contentType = request.getContentType();
        if (contentType != null && contentType.contains("multipart/")) {
            filterChain.doFilter(request, response);
            return;
        }

        SanitizedRequestWrapper sanitizedRequest = new SanitizedRequestWrapper(request);
        filterChain.doFilter(sanitizedRequest, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/actuator") || path.startsWith("/error");
    }
}
