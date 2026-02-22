package com.tracegrade.monitoring;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Data;

@Data
@Component
@ConfigurationProperties(prefix = "cloudwatch")
public class CloudWatchProperties {

    /** Whether CloudWatch metrics export is enabled. Defaults to false. */
    private boolean enabled = false;

    /** CloudWatch namespace for all TraceGrade metrics. */
    private String namespace = "TraceGrade/Grading";

    /** AWS region for CloudWatch. */
    private String region = "us-east-1";

    /** Custom endpoint URL for LocalStack (leave blank for real AWS). */
    private String endpoint = "";

    /** How often metrics are published to CloudWatch, in seconds. */
    private int stepSeconds = 60;
}
