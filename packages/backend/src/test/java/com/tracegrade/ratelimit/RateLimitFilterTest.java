package com.tracegrade.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.FilterChain;

@ExtendWith(MockitoExtension.class)
class RateLimitFilterTest {

    @Mock
    private RateLimitService rateLimitService;

    @Mock
    private RequestMappingHandlerMapping handlerMapping;

    private RateLimitProperties properties;
    private ObjectMapper objectMapper;

    @InjectMocks
    private RateLimitFilter rateLimitFilter;

    private MockHttpServletRequest request;
    private MockHttpServletResponse response;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        properties = new RateLimitProperties();
        properties.setEnabled(true);
        objectMapper = new ObjectMapper();
        rateLimitFilter = new RateLimitFilter(rateLimitService, properties, handlerMapping, objectMapper);

        request = new MockHttpServletRequest();
        request.setRequestURI("/api/classes");
        request.setRemoteAddr("192.168.1.1");
        response = new MockHttpServletResponse();
        filterChain = mock(FilterChain.class);
    }

    @Test
    @DisplayName("Should pass request through when rate limit allows")
    void shouldPassWhenAllowed() throws Exception {
        when(rateLimitService.resolvePlan("/api/classes")).thenReturn(RateLimitPlan.API);
        when(rateLimitService.tryConsume(eq("ip:192.168.1.1"), eq(RateLimitPlan.API)))
                .thenReturn(RateLimitResult.allowed(100, 99));

        rateLimitFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(response.getHeader("X-RateLimit-Limit")).isEqualTo("100");
        assertThat(response.getHeader("X-RateLimit-Remaining")).isEqualTo("99");
    }

    @Test
    @DisplayName("Should return 429 when rate limit exceeded")
    void shouldReturn429WhenBlocked() throws Exception {
        when(rateLimitService.resolvePlan("/api/classes")).thenReturn(RateLimitPlan.API);
        when(rateLimitService.tryConsume(eq("ip:192.168.1.1"), eq(RateLimitPlan.API)))
                .thenReturn(RateLimitResult.blocked(100, 30));

        rateLimitFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain, never()).doFilter(any(), any());
        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getHeader("Retry-After")).isEqualTo("30");
        assertThat(response.getHeader("X-RateLimit-Limit")).isEqualTo("100");
        assertThat(response.getContentType()).isEqualTo("application/json");
        assertThat(response.getContentAsString()).contains("Rate limit exceeded");
    }

    @Test
    @DisplayName("Should skip rate limiting for actuator endpoints")
    void shouldSkipActuatorEndpoints() {
        request.setRequestURI("/actuator/health");
        assertThat(rateLimitFilter.shouldNotFilter(request)).isTrue();
    }

    @Test
    @DisplayName("Should skip rate limiting for error endpoint")
    void shouldSkipErrorEndpoint() {
        request.setRequestURI("/error");
        assertThat(rateLimitFilter.shouldNotFilter(request)).isTrue();
    }

    @Test
    @DisplayName("Should not skip rate limiting for API endpoints")
    void shouldNotSkipApiEndpoints() {
        request.setRequestURI("/api/classes");
        assertThat(rateLimitFilter.shouldNotFilter(request)).isFalse();
    }

    @Test
    @DisplayName("Should pass through when rate limiting is disabled")
    void shouldPassWhenDisabled() throws Exception {
        properties.setEnabled(false);

        rateLimitFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verify(rateLimitService, never()).tryConsume(any(), any());
    }

    @Test
    @DisplayName("Should use X-Forwarded-For header for client key when present")
    void shouldUseForwardedForHeader() throws Exception {
        request.addHeader("X-Forwarded-For", "10.0.0.1, 192.168.1.1");
        when(rateLimitService.resolvePlan("/api/classes")).thenReturn(RateLimitPlan.API);
        when(rateLimitService.tryConsume(eq("ip:10.0.0.1"), eq(RateLimitPlan.API)))
                .thenReturn(RateLimitResult.allowed(100, 99));

        rateLimitFilter.doFilterInternal(request, response, filterChain);

        verify(rateLimitService).tryConsume("ip:10.0.0.1", RateLimitPlan.API);
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("Should use authenticated user name for client key when available")
    void shouldUseAuthenticatedUser() throws Exception {
        request.setUserPrincipal(() -> "teacher@school.com");
        when(rateLimitService.resolvePlan("/api/classes")).thenReturn(RateLimitPlan.API);
        when(rateLimitService.tryConsume(eq("user:teacher@school.com"), eq(RateLimitPlan.API)))
                .thenReturn(RateLimitResult.allowed(100, 99));

        rateLimitFilter.doFilterInternal(request, response, filterChain);

        verify(rateLimitService).tryConsume("user:teacher@school.com", RateLimitPlan.API);
    }
}
