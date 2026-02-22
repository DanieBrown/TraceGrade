package com.tracegrade.ratelimit;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerExecutionChain;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

/**
 * Servlet filter that enforces rate limits on incoming HTTP requests.
 * Resolves the client key from the authenticated user or remote IP address,
 * determines the applicable rate limit plan (via annotation or URL pattern),
 * and adds standard rate limit headers to every response.
 */
@Slf4j
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final String HEADER_LIMIT = "X-RateLimit-Limit";
    private static final String HEADER_REMAINING = "X-RateLimit-Remaining";
    private static final String HEADER_RETRY_AFTER = "Retry-After";

    private final RateLimitService rateLimitService;
    private final RateLimitProperties rateLimitProperties;
    private final RequestMappingHandlerMapping handlerMapping;
    private final ObjectMapper objectMapper;

    public RateLimitFilter(
            RateLimitService rateLimitService,
            RateLimitProperties rateLimitProperties,
            @Qualifier("requestMappingHandlerMapping") RequestMappingHandlerMapping handlerMapping,
            ObjectMapper objectMapper) {
        this.rateLimitService = rateLimitService;
        this.rateLimitProperties = rateLimitProperties;
        this.handlerMapping = handlerMapping;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        if (!rateLimitProperties.isEnabled()) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientKey = resolveClientKey(request);
        RateLimitPlan plan = resolveRateLimitPlan(request);
        RateLimitResult result = rateLimitService.tryConsume(clientKey, plan);

        response.setHeader(HEADER_LIMIT, String.valueOf(result.getLimit()));
        response.setHeader(HEADER_REMAINING, String.valueOf(result.getRemaining()));

        if (result.isAllowed()) {
            filterChain.doFilter(request, response);
        } else {
            response.setHeader(HEADER_RETRY_AFTER, String.valueOf(result.getRetryAfterSeconds()));
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);

            var errorBody = new RateLimitErrorResponse(
                    HttpStatus.TOO_MANY_REQUESTS.value(),
                    "Rate limit exceeded. Try again in " + result.getRetryAfterSeconds() + " seconds.",
                    result.getRetryAfterSeconds()
            );
            response.getWriter().write(objectMapper.writeValueAsString(errorBody));
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/actuator") || path.startsWith("/error");
    }

    private String resolveClientKey(HttpServletRequest request) {
        // Use authenticated user if available, otherwise fall back to IP
        var principal = request.getUserPrincipal();
        if (principal != null) {
            return "user:" + principal.getName();
        }

        // Check for proxied IP
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return "ip:" + forwarded.split(",")[0].trim();
        }
        return "ip:" + request.getRemoteAddr();
    }

    private RateLimitPlan resolveRateLimitPlan(HttpServletRequest request) {
        // First try to resolve from @RateLimit annotation on the handler method
        try {
            HandlerExecutionChain chain = handlerMapping.getHandler(request);
            if (chain != null && chain.getHandler() instanceof HandlerMethod handlerMethod) {
                RateLimit methodAnnotation = handlerMethod.getMethodAnnotation(RateLimit.class);
                if (methodAnnotation != null) {
                    return methodAnnotation.value();
                }
                RateLimit classAnnotation = handlerMethod.getBeanType().getAnnotation(RateLimit.class);
                if (classAnnotation != null) {
                    return classAnnotation.value();
                }
            }
        } catch (Exception e) {
            log.debug("Could not resolve handler for rate limit annotation lookup", e);
        }

        // Fall back to URL-based resolution
        return rateLimitService.resolvePlan(request.getRequestURI());
    }

    /**
     * JSON response body returned when a rate limit is exceeded.
     */
    public record RateLimitErrorResponse(int status, String message, long retryAfterSeconds) {}
}
