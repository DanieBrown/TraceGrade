package com.tracegrade.grading;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tracegrade.openai.dto.GradingRequest;
import com.tracegrade.openai.dto.GradingResponse;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class ClaudeSonnetGradingService implements AIGradingService {

    private static final String API_URL = "https://api.anthropic.com/v1/messages";
    private static final String MODEL = "claude-sonnet-4-6";
    private static final String ANTHROPIC_VERSION = "2023-06-01";

    @Value("${ANTHROPIC_API_KEY:}")
    private String apiKey;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public ClaudeSonnetGradingService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .build();
    }

    @Override
    public GradingResponse gradeSubmission(GradingRequest request) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ProviderNotConfiguredException(GradingProvider.CLAUDE_SONNET);
        }

        log.info("Grading with Claude Sonnet: questionNumber={}", request.getQuestionNumber());

        try {
            String requestBody = buildRequestBody(request);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(API_URL))
                    .header("Content-Type", "application/json")
                    .header("x-api-key", apiKey)
                    .header("anthropic-version", ANTHROPIC_VERSION)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofSeconds(60))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("Claude API error: status={} body={}", response.statusCode(), response.body());
                throw new GradingProviderException(GradingProvider.CLAUDE_SONNET,
                        "HTTP " + response.statusCode() + " from Claude API");
            }

            return parseResponse(response.body(), request);
        } catch (ProviderNotConfiguredException | GradingProviderException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Claude API call interrupted for questionNumber={}", request.getQuestionNumber(), e);
            throw new GradingProviderException(GradingProvider.CLAUDE_SONNET, e.getMessage());
        } catch (Exception e) {
            log.error("Claude API call failed for questionNumber={}: {}", request.getQuestionNumber(), e.getMessage(), e);
            throw new GradingProviderException(GradingProvider.CLAUDE_SONNET, e.getMessage());
        }
    }

    private String buildRequestBody(GradingRequest request) throws Exception {
        var userContent = new java.util.ArrayList<Object>();

        userContent.add(java.util.Map.of("type", "text", "text", buildGradingPrompt(request)));

        ImageData imageData = fetchImageData(request.getSubmissionImageUrl());
        userContent.add(java.util.Map.of(
                "type", "image",
                "source", java.util.Map.of(
                        "type", "base64",
                        "media_type", imageData.mimeType(),
                        "data", imageData.base64()
                )
        ));

        if (request.getExpectedAnswerImageUrl() != null && !request.getExpectedAnswerImageUrl().isBlank()) {
            userContent.add(java.util.Map.of("type", "text",
                    "text", "A teacher-provided model answer image is attached next. Use it as rubric context."));
            ImageData answerImage = fetchImageData(request.getExpectedAnswerImageUrl());
            userContent.add(java.util.Map.of(
                    "type", "image",
                    "source", java.util.Map.of(
                            "type", "base64",
                            "media_type", answerImage.mimeType(),
                            "data", answerImage.base64()
                    )
            ));
        }

        var body = java.util.Map.of(
                "model", MODEL,
                "max_tokens", 1000,
                "system", buildSystemPrompt(),
                "messages", java.util.List.of(
                        java.util.Map.of("role", "user", "content", userContent)
                )
        );

        return objectMapper.writeValueAsString(body);
    }

    private GradingResponse parseResponse(String responseBody, GradingRequest request) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String text = root.path("content").get(0).path("text").asText();

            text = text.trim();
            if (text.startsWith("```")) {
                text = text.replaceAll("^```[a-z]*\\n?", "").replaceAll("```$", "").trim();
            }

            JsonNode node = objectMapper.readTree(text);
            boolean illegible = node.has("illegible") && node.get("illegible").booleanValue();

            int promptTokens = root.path("usage").path("input_tokens").asInt(0);
            int completionTokens = root.path("usage").path("output_tokens").asInt(0);

            return GradingResponse.builder()
                    .questionNumber(request.getQuestionNumber())
                    .pointsAwarded(node.get("pointsAwarded").decimalValue())
                    .pointsAvailable(request.getPointsAvailable())
                    .confidenceScore(node.get("confidenceScore").doubleValue())
                    .feedback(node.get("feedback").asText())
                    .illegible(illegible)
                    .promptTokensUsed(promptTokens)
                    .completionTokensUsed(completionTokens)
                    .build();
        } catch (Exception e) {
            log.error("Failed to parse Claude grading response: {}", responseBody, e);
            throw new GradingProviderException(GradingProvider.CLAUDE_SONNET, "Failed to parse response: " + e.getMessage());
        }
    }

    private String buildSystemPrompt() {
        return """
                You are an expert grader. Analyze handwritten student answers in images.
                Respond in strict JSON format with these exact fields:
                pointsAwarded (number), feedback (string),
                confidenceScore (number between 0.0 and 1.0), illegible (boolean).
                If the handwriting cannot be read, set illegible=true and pointsAwarded=0.
                Return only valid JSON, no markdown fences.
                """;
    }

    private String buildGradingPrompt(GradingRequest req) {
        return String.format(
                """
                Grade the handwritten answer in the image for question %d.
                Expected answer: %s
                Teacher model answer image attached: %s
                Acceptable variations: %s
                Grading notes: %s
                Points available: %s
                Respond with JSON only.
                """,
                req.getQuestionNumber(),
                req.getExpectedAnswer(),
                req.getExpectedAnswerImageUrl() != null && !req.getExpectedAnswerImageUrl().isBlank() ? "yes" : "no",
                req.getAcceptableVariations() != null ? req.getAcceptableVariations() : "none specified",
                req.getGradingNotes() != null ? req.getGradingNotes() : "none",
                req.getPointsAvailable());
    }

    private ImageData fetchImageData(String url) throws IOException, InterruptedException {
        if (url.startsWith("data:")) {
            return parseDataUri(url);
        }

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .GET()
                .timeout(Duration.ofSeconds(30))
                .build();

        HttpResponse<byte[]> response = httpClient.send(req, HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() != 200) {
            throw new IOException("Failed to fetch image: HTTP " + response.statusCode());
        }

        String contentType = response.headers().firstValue("Content-Type").orElse("image/png");
        String mimeType = contentType.split(";")[0].trim();
        String base64 = Base64.getEncoder().encodeToString(response.body());
        return new ImageData(mimeType, base64);
    }

    private ImageData parseDataUri(String dataUri) {
        int commaIndex = dataUri.indexOf(',');
        if (commaIndex < 0) {
            return new ImageData("image/png", dataUri);
        }
        String header = dataUri.substring(5, commaIndex);
        String base64 = dataUri.substring(commaIndex + 1);
        String mimeType = header.contains(";") ? header.substring(0, header.indexOf(';')) : header;
        return new ImageData(mimeType, base64);
    }

    private record ImageData(String mimeType, String base64) {}
}