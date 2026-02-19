package com.tracegrade.openai;

import java.time.Duration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import com.tracegrade.openai.exception.OpenAiException;
import com.tracegrade.openai.model.ChatCompletionResponse;

import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;
import software.amazon.awssdk.services.secretsmanager.model.GetSecretValueRequest;

@Slf4j
@Configuration
public class OpenAiClientConfig {

    @Bean
    public String openAiApiKey(OpenAiProperties properties) {
        if ("secrets-manager".equalsIgnoreCase(properties.getKeySource())) {
            return resolveFromSecretsManager(properties);
        }
        String key = properties.getApiKey();
        if (key == null || key.isBlank()) {
            throw new IllegalStateException(
                    "OPENAI_API_KEY is not configured. " +
                    "Set openai.api-key or use openai.key-source=secrets-manager");
        }
        log.info("OpenAI API key loaded from environment/config");
        return key;
    }

    @Bean
    public RestClient openAiRestClient(OpenAiProperties properties, String openAiApiKey) {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory();
        factory.setReadTimeout(Duration.ofSeconds(properties.getTimeoutSeconds()));

        return RestClient.builder()
                .baseUrl(properties.getBaseUrl())
                .requestFactory(factory)
                .defaultHeader("Authorization", "Bearer " + openAiApiKey)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }

    @Bean
    public ChatCompletionGateway chatCompletionGateway(RestClient openAiRestClient) {
        return request -> openAiRestClient.post()
                .uri("/chat/completions")
                .body(request)
                .retrieve()
                .onStatus(status -> status.is4xxClientError(), (req, resp) -> {
                    int code = resp.getStatusCode().value();
                    throw new OpenAiException("HTTP_CALL",
                            "OpenAI API client error: HTTP " + code, code);
                })
                .onStatus(status -> status.is5xxServerError(), (req, resp) -> {
                    int code = resp.getStatusCode().value();
                    throw new OpenAiException("HTTP_CALL",
                            "OpenAI API server error: HTTP " + code, code);
                })
                .body(ChatCompletionResponse.class);
    }

    private String resolveFromSecretsManager(OpenAiProperties properties) {
        log.info("Fetching OpenAI API key from Secrets Manager: {}", properties.getSecretName());
        try (SecretsManagerClient client = SecretsManagerClient.builder()
                .credentialsProvider(DefaultCredentialsProvider.create())
                .region(Region.of(System.getenv().getOrDefault("AWS_REGION", "us-east-1")))
                .build()) {

            GetSecretValueRequest request = GetSecretValueRequest.builder()
                    .secretId(properties.getSecretName())
                    .build();

            String secret = client.getSecretValue(request).secretString();
            log.info("OpenAI API key loaded from Secrets Manager: {}", properties.getSecretName());
            return secret;
        } catch (Exception e) {
            throw new IllegalStateException(
                    "Failed to load OpenAI API key from Secrets Manager: " + properties.getSecretName(), e);
        }
    }
}
