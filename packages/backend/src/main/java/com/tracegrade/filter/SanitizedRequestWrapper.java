package com.tracegrade.filter;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.stream.Collectors;

import org.owasp.html.PolicyFactory;
import org.owasp.html.Sanitizers;

import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

public class SanitizedRequestWrapper extends HttpServletRequestWrapper {

    private static final PolicyFactory POLICY = Sanitizers.FORMATTING
            .and(Sanitizers.BLOCKS);

    private final byte[] sanitizedBody;

    public SanitizedRequestWrapper(HttpServletRequest request) throws IOException {
        super(request);
        String contentType = request.getContentType();
        if (contentType != null && contentType.contains("application/json")) {
            String body = request.getReader().lines().collect(Collectors.joining());
            this.sanitizedBody = sanitizeJsonStrings(body).getBytes(StandardCharsets.UTF_8);
        } else {
            this.sanitizedBody = null;
        }
    }

    @Override
    public String getParameter(String name) {
        String value = super.getParameter(name);
        return value != null ? sanitize(value) : null;
    }

    @Override
    public String[] getParameterValues(String name) {
        String[] values = super.getParameterValues(name);
        if (values == null) {
            return null;
        }
        String[] sanitized = new String[values.length];
        for (int i = 0; i < values.length; i++) {
            sanitized[i] = sanitize(values[i]);
        }
        return sanitized;
    }

    @Override
    public Map<String, String[]> getParameterMap() {
        return super.getParameterMap().entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> {
                            String[] vals = e.getValue();
                            String[] sanitized = new String[vals.length];
                            for (int i = 0; i < vals.length; i++) {
                                sanitized[i] = sanitize(vals[i]);
                            }
                            return sanitized;
                        }));
    }

    @Override
    public ServletInputStream getInputStream() throws IOException {
        if (sanitizedBody == null) {
            return super.getInputStream();
        }
        ByteArrayInputStream bais = new ByteArrayInputStream(sanitizedBody);
        return new ServletInputStream() {
            @Override
            public int read() {
                return bais.read();
            }

            @Override
            public boolean isFinished() {
                return bais.available() == 0;
            }

            @Override
            public boolean isReady() {
                return true;
            }

            @Override
            public void setReadListener(ReadListener listener) {
                // Not needed for synchronous processing
            }
        };
    }

    @Override
    public BufferedReader getReader() throws IOException {
        if (sanitizedBody == null) {
            return super.getReader();
        }
        return new BufferedReader(
                new InputStreamReader(new ByteArrayInputStream(sanitizedBody), StandardCharsets.UTF_8));
    }

    private static String sanitize(String input) {
        if (input == null) {
            return null;
        }
        return POLICY.sanitize(input);
    }

    /**
     * Lightweight JSON string sanitization that strips the most dangerous XSS patterns.
     * The primary XSS defenses are CSP headers and output encoding.
     */
    private static String sanitizeJsonStrings(String json) {
        return json.replaceAll("<[^>]*script[^>]*>", "")
                   .replaceAll("(?i)javascript:", "")
                   .replaceAll("(?i)on\\w+\\s*=", "");
    }
}
