package com.tracegrade.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Data;

@Data
@Component
@ConfigurationProperties(prefix = "storage")
public class StorageProperties {

    /** Storage provider: "s3" or "local" */
    private String provider = "s3";

    private final S3 s3 = new S3();

    @Data
    public static class S3 {

        /** S3 bucket name */
        private String bucketName = "tracegrade-exams-dev";

        /** AWS region */
        private String region = "us-east-1";

        /** Custom endpoint for LocalStack/MinIO (optional) */
        private String endpoint;

        /** Presigned URL expiration in minutes */
        private int presignedUrlExpirationMinutes = 15;

        /** Optional path prefix for all S3 keys */
        private String pathPrefix = "";
    }
}
