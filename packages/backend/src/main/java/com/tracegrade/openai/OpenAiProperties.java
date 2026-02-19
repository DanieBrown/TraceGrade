package com.tracegrade.openai;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Data;

@Data
@Component
@ConfigurationProperties(prefix = "openai")
public class OpenAiProperties {

    /** Where to fetch the API key from: "secrets-manager" or "env" */
    private String keySource = "env";

    /** AWS Secrets Manager secret name/ARN (used when keySource=secrets-manager) */
    private String secretName = "tracegrade/openai-api-key";

    /** API key resolved from environment/config (used when keySource=env) */
    private String apiKey;

    /** OpenAI API base URL */
    private String baseUrl = "https://api.openai.com/v1";

    /** Model for chat completions (exam generation) */
    private String chatModel = "gpt-4o";

    /** Model for vision-based grading */
    private String visionModel = "gpt-4o";

    /** Connect + read timeout in seconds */
    private int timeoutSeconds = 30;

    /** Max retries on 429 rate-limit responses */
    private int maxRetries = 3;

    /** Base backoff delay in milliseconds (doubles each retry) */
    private long retryBaseDelayMs = 1000;

    /** Max tokens for exam generation responses */
    private int examMaxTokens = 2000;

    /** Max tokens for grading responses */
    private int gradingMaxTokens = 1000;

    /** Temperature for exam generation (higher = more creative) */
    private double examTemperature = 0.7;

    /** Temperature for grading (lower = more deterministic) */
    private double gradingTemperature = 0.2;
}
