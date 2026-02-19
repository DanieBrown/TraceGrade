package com.tracegrade.openai;

import java.util.List;
import java.util.function.Supplier;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tracegrade.openai.dto.ExamGenerationRequest;
import com.tracegrade.openai.dto.ExamGenerationResponse;
import com.tracegrade.openai.dto.GradingRequest;
import com.tracegrade.openai.dto.GradingResponse;
import com.tracegrade.openai.exception.OpenAiException;
import com.tracegrade.openai.exception.OpenAiRateLimitException;
import com.tracegrade.openai.model.ChatCompletionRequest;
import com.tracegrade.openai.model.ChatCompletionResponse;
import com.tracegrade.openai.model.VisionMessageContent;
import com.tracegrade.openai.retry.RetryConfig;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class OpenAiServiceImpl implements OpenAiService {

    private final ChatCompletionGateway gateway;
    private final OpenAiProperties properties;
    private final ObjectMapper objectMapper;
    private final RetryConfig retryConfig;

    public OpenAiServiceImpl(ChatCompletionGateway chatCompletionGateway,
                              OpenAiProperties properties,
                              ObjectMapper objectMapper) {
        this.gateway = chatCompletionGateway;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.retryConfig = RetryConfig.from(properties.getMaxRetries(), properties.getRetryBaseDelayMs());
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    @Override
    public ExamGenerationResponse generateExam(ExamGenerationRequest request) {
        log.info("Generating exam: subject={}, topic={}, questions={}",
                request.getSubject(), request.getTopic(), request.getQuestionCount());

        ChatCompletionRequest body = new ChatCompletionRequest(
                properties.getChatModel(),
                List.of(
                        new ChatCompletionRequest.Message("system", buildExamSystemPrompt()),
                        new ChatCompletionRequest.Message("user", buildExamUserPrompt(request))
                ),
                properties.getExamMaxTokens(),
                properties.getExamTemperature(),
                ChatCompletionRequest.ResponseFormat.json()
        );

        ChatCompletionResponse raw = withRetry("EXAM_GENERATION", () -> gateway.complete(body));
        return parseExamResponse(raw, request);
    }

    @Override
    public GradingResponse gradeSubmission(GradingRequest request) {
        log.info("Grading submission: questionNumber={}", request.getQuestionNumber());

        List<Object> userContent = List.of(
                VisionMessageContent.text(buildGradingUserPrompt(request)),
                VisionMessageContent.imageUrl(request.getSubmissionImageUrl())
        );

        ChatCompletionRequest body = new ChatCompletionRequest(
                properties.getVisionModel(),
                List.of(
                        new ChatCompletionRequest.Message("system", buildGradingSystemPrompt()),
                        new ChatCompletionRequest.Message("user", userContent)
                ),
                properties.getGradingMaxTokens(),
                properties.getGradingTemperature(),
                ChatCompletionRequest.ResponseFormat.json()
        );

        ChatCompletionResponse raw = withRetry("GRADING", () -> gateway.complete(body));
        return parseGradingResponse(raw, request);
    }

    // -------------------------------------------------------------------------
    // Retry helper — exponential backoff on 429 only
    // -------------------------------------------------------------------------

    private <T> T withRetry(String operation, Supplier<T> call) {
        int attempts = 0;
        long delay = retryConfig.baseDelayMs();

        while (true) {
            try {
                return call.get();
            } catch (OpenAiException e) {
                if (e.getHttpStatus() == 429 && attempts < retryConfig.maxRetries()) {
                    attempts++;
                    log.warn("OpenAI rate limit hit for operation={}, attempt={}/{}, retrying in {}ms",
                            operation, attempts, retryConfig.maxRetries(), delay);
                    sleep(delay);
                    delay = delay * 2;
                } else if (e.getHttpStatus() == 429) {
                    log.error("OpenAI rate limit exhausted for operation={} after {} attempt(s)",
                            operation, attempts + 1);
                    throw new OpenAiRateLimitException(operation, attempts + 1);
                } else {
                    log.error("OpenAI API error for operation={}: status={}, message={}",
                            operation, e.getHttpStatus(), e.getMessage());
                    throw e;
                }
            }
        }
    }

    private void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new OpenAiException("RETRY_SLEEP", "Interrupted during retry backoff", 0, ie);
        }
    }

    // -------------------------------------------------------------------------
    // Prompt builders
    // -------------------------------------------------------------------------

    private String buildExamSystemPrompt() {
        return """
                You are an expert educator. Generate exam questions in strict JSON format.
                Your response must be a valid JSON object with a "questions" array.
                Each question must have these exact fields: questionNumber (integer),
                questionText (string), expectedAnswer (string), gradingGuidance (string),
                pointsAvailable (number).
                """;
    }

    private String buildExamUserPrompt(ExamGenerationRequest req) {
        String difficulty = req.getDifficultyLevel() != null ? req.getDifficultyLevel() : "MEDIUM";
        String extra = req.getAdditionalInstructions() != null
                ? " Additional instructions: " + req.getAdditionalInstructions()
                : "";
        return String.format(
                "Generate %d %s-level exam questions for %s students studying '%s' about '%s'.%s",
                req.getQuestionCount(), difficulty, req.getGradeLevel(),
                req.getSubject(), req.getTopic(), extra);
    }

    private String buildGradingSystemPrompt() {
        return """
                You are an expert grader. Analyze handwritten student answers in images.
                Respond in strict JSON format with these exact fields:
                pointsAwarded (number), feedback (string),
                confidenceScore (number between 0.0 and 1.0), illegible (boolean).
                If the handwriting cannot be read, set illegible=true and pointsAwarded=0.
                """;
    }

    private String buildGradingUserPrompt(GradingRequest req) {
        return String.format(
                """
                Grade the handwritten answer in the image for question %d.
                Expected answer: %s
                Acceptable variations: %s
                Grading notes: %s
                Points available: %s
                Respond with JSON only.
                """,
                req.getQuestionNumber(),
                req.getExpectedAnswer(),
                req.getAcceptableVariations() != null ? req.getAcceptableVariations() : "none specified",
                req.getGradingNotes() != null ? req.getGradingNotes() : "none",
                req.getPointsAvailable());
    }

    // -------------------------------------------------------------------------
    // Response parsers
    // -------------------------------------------------------------------------

    private ExamGenerationResponse parseExamResponse(ChatCompletionResponse raw,
                                                      ExamGenerationRequest req) {
        String content = raw.choices().get(0).message().content();
        try {
            JsonNode root = objectMapper.readTree(content);
            List<ExamGenerationResponse.GeneratedQuestion> questions = objectMapper.convertValue(
                    root.get("questions"),
                    objectMapper.getTypeFactory().constructCollectionType(
                            List.class, ExamGenerationResponse.GeneratedQuestion.class));

            return ExamGenerationResponse.builder()
                    .subject(req.getSubject())
                    .topic(req.getTopic())
                    .gradeLevel(req.getGradeLevel())
                    .questions(questions)
                    .promptTokensUsed(raw.usage().promptTokens())
                    .completionTokensUsed(raw.usage().completionTokens())
                    .build();
        } catch (Exception e) {
            log.error("Failed to parse exam generation response content: {}", content, e);
            throw new OpenAiException("PARSE_EXAM", "Failed to parse OpenAI exam response", 200, e);
        }
    }

    private GradingResponse parseGradingResponse(ChatCompletionResponse raw, GradingRequest req) {
        String content = raw.choices().get(0).message().content();
        try {
            JsonNode node = objectMapper.readTree(content);
            boolean illegible = node.has("illegible") && node.get("illegible").booleanValue();

            return GradingResponse.builder()
                    .questionNumber(req.getQuestionNumber())
                    .pointsAwarded(node.get("pointsAwarded").decimalValue())
                    .pointsAvailable(req.getPointsAvailable())
                    .confidenceScore(node.get("confidenceScore").doubleValue())
                    .feedback(node.get("feedback").asText())
                    .illegible(illegible)
                    .promptTokensUsed(raw.usage().promptTokens())
                    .completionTokensUsed(raw.usage().completionTokens())
                    .build();
        } catch (Exception e) {
            log.error("Failed to parse grading response content: {}", content, e);
            throw new OpenAiException("PARSE_GRADING", "Failed to parse OpenAI grading response", 200, e);
        }
    }
}
