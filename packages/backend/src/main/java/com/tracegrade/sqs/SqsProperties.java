package com.tracegrade.sqs;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Data;

@Data
@Component
@ConfigurationProperties(prefix = "sqs")
public class SqsProperties {

    /** Whether SQS-based async grading is enabled. Defaults to false (synchronous fallback). */
    private boolean enabled = false;

    /** URL of the main grading queue. */
    private String queueUrl = "";

    /** URL of the dead-letter queue for failed grading jobs. */
    private String dlqUrl = "";

    /** AWS region. */
    private String region = "us-east-1";

    /** Custom endpoint URL for LocalStack (leave blank for real AWS). */
    private String endpoint = "";

    /** Seconds a message is hidden from other consumers after being received. */
    private int visibilityTimeoutSeconds = 300;

    /** Maximum number of receive attempts before a message is sent to the DLQ. */
    private int maxReceiveCount = 3;

    /** Seconds to wait for messages during a long-poll receive (0-20). */
    private int waitTimeSeconds = 20;

    /** Maximum number of messages to retrieve per polling cycle (1-10). */
    private int maxMessagesPerPoll = 10;
}
