package com.tracegrade.storage;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class StoragePropertiesTest {

    @Test
    @DisplayName("Should have correct default provider")
    void defaultProvider() {
        StorageProperties props = new StorageProperties();
        assertThat(props.getProvider()).isEqualTo("s3");
    }

    @Test
    @DisplayName("Should have correct default S3 bucket name")
    void defaultBucketName() {
        StorageProperties props = new StorageProperties();
        assertThat(props.getS3().getBucketName()).isEqualTo("tracegrade-exams-dev");
    }

    @Test
    @DisplayName("Should have correct default S3 region")
    void defaultRegion() {
        StorageProperties props = new StorageProperties();
        assertThat(props.getS3().getRegion()).isEqualTo("us-east-1");
    }

    @Test
    @DisplayName("Should have null endpoint by default")
    void defaultEndpoint() {
        StorageProperties props = new StorageProperties();
        assertThat(props.getS3().getEndpoint()).isNull();
    }

    @Test
    @DisplayName("Should have 15 minute default presigned URL expiration")
    void defaultPresignedExpiration() {
        StorageProperties props = new StorageProperties();
        assertThat(props.getS3().getPresignedUrlExpirationMinutes()).isEqualTo(15);
    }

    @Test
    @DisplayName("Should have empty default path prefix")
    void defaultPathPrefix() {
        StorageProperties props = new StorageProperties();
        assertThat(props.getS3().getPathPrefix()).isEmpty();
    }

    @Test
    @DisplayName("Should allow setting custom provider")
    void customProvider() {
        StorageProperties props = new StorageProperties();
        props.setProvider("local");
        assertThat(props.getProvider()).isEqualTo("local");
    }

    @Test
    @DisplayName("Should allow setting custom S3 properties")
    void customS3Properties() {
        StorageProperties props = new StorageProperties();
        props.getS3().setBucketName("my-bucket");
        props.getS3().setRegion("eu-west-1");
        props.getS3().setEndpoint("http://localhost:4566");
        props.getS3().setPresignedUrlExpirationMinutes(30);
        props.getS3().setPathPrefix("tenant1/");

        assertThat(props.getS3().getBucketName()).isEqualTo("my-bucket");
        assertThat(props.getS3().getRegion()).isEqualTo("eu-west-1");
        assertThat(props.getS3().getEndpoint()).isEqualTo("http://localhost:4566");
        assertThat(props.getS3().getPresignedUrlExpirationMinutes()).isEqualTo(30);
        assertThat(props.getS3().getPathPrefix()).isEqualTo("tenant1/");
    }
}
