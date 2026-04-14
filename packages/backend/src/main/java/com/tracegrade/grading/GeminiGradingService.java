package com.tracegrade.grading;

import java.io.IOException;
import java.math.BigDecimal;
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
public class GeminiGradingService implements AIGradingService {

    private static final String API_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    @Value("${GEMINI_API_KEY:}")
    private String apiKey;

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public GeminiGradingService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .build();
    }

    @Override
    public GradingResponse gradeSubmission(GradingRequest request) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ProviderNotConfiguredException(GradingProvider.GEMINI_FLASH);
        }

        log.info("Grading with Gemini Flash: questionNumber={}", request.getQuestionNumber());

        try {
            ImageData imageData = fetchImageData(request.getSubmissionImageUrl());
            String requestBody = buildRequestBody(request, imageData);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(API_URL + "?key=" + apiKey))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofSeconds(60))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("Gemini API error: status={} body={}", response.statusCode(), response.body());
                throw new GradingProviderException(GradingProvider.GEMINI_FLASH,
                        "HTTP " + response.statusCode() + " from Gemini API");
            }

            return parseResponse(response.body(), request);
        } catch (ProviderNotConfiguredException | GradingProviderException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Gemini API call interrupted for questionNumber={}", request.getQuestionNumber(), e);
            throw new GradingProviderException(GradingProvider.GEMINI_FLASH, e.getMessage());
        } catch (Exception e) {
            log.error("Gemini API call failed for questionNumber={}: {}", request.getQuestionNumber(), e.getMessage(), e);
            throw new GradingProviderException(GradingProvider.GEMINI_FLASH, e.getMessage());
        }
    }

    private String buildRequestBody(GradingRequest request, ImageData imageData) throws Exception {
        var parts = new java.util.ArrayList<Object>();
        parts.add(java.util.Map.of("text", buildGradingPrompt(request)));
        parts.add(java.util.Map.of(
                "inlineData", java.util.Map.of(
                        "mimeType", imageData.mimeType(),
                        "data", imageData.base64()
                )
        ));

        if (request.getExpectedAnswerImageUrl() != null && !request.getExpectedAnswerImageUrl().isBlank()) {
            parts.add(java.util.Map.of("text",
                    "A teacher-provided model answer image is attached next. Use it as rubric context."));
            ImageData answerImage = fetchImageData(request.getExpectedAnswerImageUrl());
            parts.add(java.util.Map.of(
                    "inlineData", java.util.Map.of(
                            "mimeType", answerImage.mimeType(),
                            "data", answerImage.base64()
                    )
            ));
        }

        var body = java.util.Map.of(
                "system_instruction", java.util.Map.of(
                        "parts", java.util.List.of(java.util.Map.of("text", buildSystemPrompt()))
                ),
                "contents", java.util.List.of(
                        java.util.Map.of("parts", parts)
                ),
                "generationConfig", java.util.Map.of(
                        "responseMimeType", "application/json",
                        "temperature", 0.2,
                        "maxOutputTokens", 1000
                )
        );

        return objectMapper.writeValueAsString(body);
    }

    private GradingResponse parseResponse(String responseBody, GradingRequest request) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String text = root
                    .path("candidates").get(0)
                    .path("content")
                    .path("parts").get(0)
                    .path("text").asText();

            JsonNode node = objectMapper.readTree(text);
            boolean illegible = node.has("illegible") && node.get("illegible").booleanValue();

            int promptTokens = root.path("usageMetadata").path("promptTokenCount").asInt(0);
            int completionTokens = root.path("usageMetadata").path("candidatesTokenCount").asInt(0);

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
            log.error("Failed to parse Gemini grading response: {}", responseBody, e);
            throw new GradingProviderException(GradingProvider.GEMINI_FLASH, "Failed to parse response: " + e.getMessage());
        }
    }

    private String buildSystemPrompt() {
        return """
                You are an expert grader. Analyze handwritten student answers in images.
                Respond in strict JSON format with these exact fields:
                pointsAwarded (number), feedback (string),
                confidenceScore (number between 0.0 and 1.0), illegible (boolean).
                If the handwriting cannot be read, set illegible=true and pointsAwarded=0.
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