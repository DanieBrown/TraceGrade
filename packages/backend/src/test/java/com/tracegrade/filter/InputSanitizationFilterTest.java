package com.tracegrade.filter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import jakarta.servlet.FilterChain;

class InputSanitizationFilterTest {

    private SanitizationProperties properties;
    private InputSanitizationFilter filter;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        properties = new SanitizationProperties();
        properties.setEnabled(true);
        filter = new InputSanitizationFilter(properties);
        request = new MockHttpServletRequest();
        request.setRequestURI("/api/test");
        response = new MockHttpServletResponse();
        filterChain = mock(FilterChain.class);
    }

    @Test
    @DisplayName("Should sanitize script tags from request parameters")
    void shouldSanitizeScriptTags() throws Exception {
        request.setParameter("name", "<script>alert(1)</script>Hello");
        request.setContentType("text/plain");

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(
                org.mockito.ArgumentMatchers.argThat(req -> {
                    var wrapper = (SanitizedRequestWrapper) req;
                    String sanitized = wrapper.getParameter("name");
                    return sanitized != null && !sanitized.contains("<script>");
                }),
                org.mockito.ArgumentMatchers.eq(response));
    }

    @Test
    @DisplayName("Should pass through clean input unchanged")
    void shouldPassCleanInput() throws Exception {
        request.setParameter("name", "John Doe");
        request.setContentType("text/plain");

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(
                org.mockito.ArgumentMatchers.argThat(req -> {
                    var wrapper = (SanitizedRequestWrapper) req;
                    return "John Doe".equals(wrapper.getParameter("name"));
                }),
                org.mockito.ArgumentMatchers.eq(response));
    }

    @Test
    @DisplayName("Should skip multipart requests")
    void shouldSkipMultipart() throws Exception {
        request.setContentType("multipart/form-data; boundary=----WebKitFormBoundary");

        filter.doFilterInternal(request, response, filterChain);

        // Original request should be passed through, not wrapped
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("Should skip actuator endpoints")
    void shouldSkipActuator() {
        request.setRequestURI("/actuator/health");
        assertThat(filter.shouldNotFilter(request)).isTrue();
    }

    @Test
    @DisplayName("Should skip error endpoint")
    void shouldSkipError() {
        request.setRequestURI("/error");
        assertThat(filter.shouldNotFilter(request)).isTrue();
    }

    @Test
    @DisplayName("Should not skip API endpoints")
    void shouldNotSkipApi() {
        request.setRequestURI("/api/exams");
        assertThat(filter.shouldNotFilter(request)).isFalse();
    }

    @Test
    @DisplayName("Should pass through when disabled")
    void shouldPassWhenDisabled() throws Exception {
        properties.setEnabled(false);

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }
}
