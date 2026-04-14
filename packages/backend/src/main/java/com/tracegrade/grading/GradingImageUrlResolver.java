package com.tracegrade.grading;

import org.springframework.stereotype.Service;

import com.tracegrade.storage.StorageProperties;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GradingImageUrlResolver {

    private final StorageProperties storageProperties;

    public String resolveForBackendFetch(String url) {
        if (url == null || url.isBlank() || url.startsWith("data:")) {
            return url;
        }

        String publicEndpoint = normalizeEndpoint(storageProperties.getS3().getPublicEndpoint());
        String internalEndpoint = normalizeEndpoint(storageProperties.getS3().getEndpoint());

        if (publicEndpoint == null || internalEndpoint == null || publicEndpoint.equals(internalEndpoint)) {
            return url;
        }

        if (url.equals(publicEndpoint)) {
            return internalEndpoint;
        }

        if (url.startsWith(publicEndpoint + "/")) {
            return internalEndpoint + url.substring(publicEndpoint.length());
        }

        return url;
    }

    private static String normalizeEndpoint(String endpoint) {
        if (endpoint == null) {
            return null;
        }

        String trimmed = endpoint.trim();
        if (trimmed.isEmpty()) {
            return null;
        }

        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }
}