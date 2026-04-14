package com.tracegrade.grading;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.tracegrade.storage.StorageProperties;

class GradingImageUrlResolverTest {

    @Test
    @DisplayName("Rewrites browser-facing LocalStack URLs to the internal backend endpoint")
    void rewritesPublicS3UrlToInternalEndpoint() {
        StorageProperties properties = new StorageProperties();
        properties.getS3().setPublicEndpoint("http://localhost:4566");
        properties.getS3().setEndpoint("http://localstack:4566");

        GradingImageUrlResolver resolver = new GradingImageUrlResolver(properties);

        String actual = resolver.resolveForBackendFetch(
                "http://localhost:4566/tracegrade-exams-dev/submissions/example.png");

        assertThat(actual)
                .isEqualTo("http://localstack:4566/tracegrade-exams-dev/submissions/example.png");
    }

    @Test
    @DisplayName("Leaves unrelated external image URLs unchanged")
    void leavesExternalUrlsUnchanged() {
        StorageProperties properties = new StorageProperties();
        properties.getS3().setPublicEndpoint("http://localhost:4566");
        properties.getS3().setEndpoint("http://localstack:4566");

        GradingImageUrlResolver resolver = new GradingImageUrlResolver(properties);

        String actual = resolver.resolveForBackendFetch("https://cdn.example.com/submissions/example.png");

        assertThat(actual).isEqualTo("https://cdn.example.com/submissions/example.png");
    }

    @Test
    @DisplayName("Leaves data URIs unchanged")
    void leavesDataUrisUnchanged() {
        StorageProperties properties = new StorageProperties();
        properties.getS3().setPublicEndpoint("http://localhost:4566");
        properties.getS3().setEndpoint("http://localstack:4566");

        GradingImageUrlResolver resolver = new GradingImageUrlResolver(properties);

        String actual = resolver.resolveForBackendFetch("data:image/png;base64,abc123");

        assertThat(actual).isEqualTo("data:image/png;base64,abc123");
    }
}