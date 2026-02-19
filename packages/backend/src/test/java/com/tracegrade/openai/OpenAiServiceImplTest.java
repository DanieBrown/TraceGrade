package com.tracegrade.openai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tracegrade.openai.dto.ExamGenerationRequest;
import com.tracegrade.openai.dto.ExamGenerationResponse;
import com.tracegrade.openai.dto.GradingRequest;
import com.tracegrade.openai.dto.GradingResponse;
import com.tracegrade.openai.exception.OpenAiException;
import com.tracegrade.openai.exception.OpenAiRateLimitException;
import com.tracegrade.openai.model.ChatCompletionResponse;

class OpenAiServiceImplTest {

    private ChatCompletionGateway gateway;
    private OpenAiProperties properties;
    private OpenAiServiceImpl service;

    @BeforeEach
    void setUp() {
        gateway = mock(ChatCompletionGateway.class);
        properties = new OpenAiProperties();
        properties.setMaxRetries(3);
        properties.setRetryBaseDelayMs(1);  // fast for tests
        properties.setChatModel("gpt-4o");
        properties.setVisionModel("gpt-4o");
        properties.setExamMaxTokens(2000);
        properties.setGradingMaxTokens(1000);
        properties.setExamTemperature(0.7);
        properties.setGradingTemperature(0.2);
        service = new OpenAiServiceImpl(gateway, properties, new ObjectMapper());
    }

    // -------------------------------------------------------------------------
    // generateExam
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("generateExam")
    class GenerateExamTests {

        @Test
        @DisplayName("Should return parsed ExamGenerationResponse on success")
        void happyPath() {
            String json = """
                    {"questions":[
                      {"questionNumber":1,"questionText":"What is photosynthesis?",
                       "expectedAnswer":"Process by which plants make food",
                       "gradingGuidance":"Must mention light and chlorophyll",
                       "pointsAvailable":5.0}
                    ]}
                    """;
            when(gateway.complete(any())).thenReturn(buildResponse(json));

            ExamGenerationResponse result = service.generateExam(buildExamRequest());

            assertThat(result.getSubject()).isEqualTo("Biology");
            assertThat(result.getTopic()).isEqualTo("Photosynthesis");
            assertThat(result.getQuestions()).hasSize(1);
            assertThat(result.getQuestions().get(0).getQuestionText()).contains("photosynthesis");
            assertThat(result.getQuestions().get(0).getPointsAvailable()).isEqualTo(5.0);
            assertThat(result.getPromptTokensUsed()).isEqualTo(100);
            assertThat(result.getCompletionTokensUsed()).isEqualTo(200);
        }

        @Test
        @DisplayName("Should retry on 429 and succeed on second attempt")
        void retryOn429ThenSucceed() {
            String json = """
                    {"questions":[
                      {"questionNumber":1,"questionText":"Q?","expectedAnswer":"A",
                       "gradingGuidance":"exact","pointsAvailable":1.0}
                    ]}
                    """;
            when(gateway.complete(any()))
                    .thenThrow(new OpenAiException("HTTP_CALL", "Rate limited", 429))
                    .thenReturn(buildResponse(json));

            ExamGenerationResponse result = service.generateExam(buildExamRequest());

            assertThat(result.getQuestions()).hasSize(1);
            verify(gateway, times(2)).complete(any());
        }

        @Test
        @DisplayName("Should throw OpenAiRateLimitException when all retries are exhausted")
        void maxRetriesExhausted() {
            when(gateway.complete(any()))
                    .thenThrow(new OpenAiException("HTTP_CALL", "Rate limited", 429));

            assertThatThrownBy(() -> service.generateExam(buildExamRequest()))
                    .isInstanceOf(OpenAiRateLimitException.class)
                    .hasMessageContaining("attempt");

            // 1 initial + 3 retries = 4 calls total
            verify(gateway, times(4)).complete(any());
        }

        @Test
        @DisplayName("Should throw OpenAiException immediately on non-429 4xx error")
        void noRetryOn4xx() {
            when(gateway.complete(any()))
                    .thenThrow(new OpenAiException("HTTP_CALL", "Bad request", 400));

            assertThatThrownBy(() -> service.generateExam(buildExamRequest()))
                    .isInstanceOf(OpenAiException.class)
                    .satisfies(e -> assertThat(((OpenAiException) e).getHttpStatus()).isEqualTo(400));

            verify(gateway, times(1)).complete(any());
        }

        @Test
        @DisplayName("Should throw OpenAiException immediately on 5xx server error")
        void noRetryOn5xx() {
            when(gateway.complete(any()))
                    .thenThrow(new OpenAiException("HTTP_CALL", "Internal server error", 500));

            assertThatThrownBy(() -> service.generateExam(buildExamRequest()))
                    .isInstanceOf(OpenAiException.class)
                    .satisfies(e -> assertThat(((OpenAiException) e).getHttpStatus()).isEqualTo(500));

            verify(gateway, times(1)).complete(any());
        }
    }

    // -------------------------------------------------------------------------
    // gradeSubmission
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("gradeSubmission")
    class GradeSubmissionTests {

        @Test
        @DisplayName("Should return GradingResponse with confidence score on success")
        void happyPath() {
            String json = """
                    {"pointsAwarded":4.5,"feedback":"Good answer, minor error",
                     "confidenceScore":0.92,"illegible":false}
                    """;
            when(gateway.complete(any())).thenReturn(buildResponse(json));

            GradingResponse result = service.gradeSubmission(buildGradingRequest());

            assertThat(result.getQuestionNumber()).isEqualTo(1);
            assertThat(result.getPointsAwarded()).isEqualByComparingTo("4.5");
            assertThat(result.getPointsAvailable()).isEqualByComparingTo("5.00");
            assertThat(result.getConfidenceScore()).isEqualTo(0.92);
            assertThat(result.getFeedback()).contains("Good answer");
            assertThat(result.isIllegible()).isFalse();
            assertThat(result.getPromptTokensUsed()).isEqualTo(100);
        }

        @Test
        @DisplayName("Should set illegible=true and pointsAwarded=0 when image cannot be read")
        void illegibleImage() {
            String json = """
                    {"pointsAwarded":0,"feedback":"Image is illegible",
                     "confidenceScore":0.0,"illegible":true}
                    """;
            when(gateway.complete(any())).thenReturn(buildResponse(json));

            GradingResponse result = service.gradeSubmission(buildGradingRequest());

            assertThat(result.isIllegible()).isTrue();
            assertThat(result.getPointsAwarded()).isEqualByComparingTo("0");
            assertThat(result.getConfidenceScore()).isEqualTo(0.0);
        }

        @Test
        @DisplayName("Should retry on 429 and succeed on second attempt")
        void retryOn429ThenSucceed() {
            String json = """
                    {"pointsAwarded":3.0,"feedback":"Correct","confidenceScore":0.8,"illegible":false}
                    """;
            when(gateway.complete(any()))
                    .thenThrow(new OpenAiException("HTTP_CALL", "Rate limited", 429))
                    .thenReturn(buildResponse(json));

            GradingResponse result = service.gradeSubmission(buildGradingRequest());

            assertThat(result.getPointsAwarded()).isEqualByComparingTo("3.0");
            verify(gateway, times(2)).complete(any());
        }

        @Test
        @DisplayName("Should throw OpenAiRateLimitException when all retries are exhausted")
        void maxRetriesExhausted() {
            when(gateway.complete(any()))
                    .thenThrow(new OpenAiException("HTTP_CALL", "Rate limited", 429));

            assertThatThrownBy(() -> service.gradeSubmission(buildGradingRequest()))
                    .isInstanceOf(OpenAiRateLimitException.class);

            verify(gateway, times(4)).complete(any());
        }

        @Test
        @DisplayName("Should throw OpenAiException immediately on 5xx server error")
        void noRetryOn5xx() {
            when(gateway.complete(any()))
                    .thenThrow(new OpenAiException("HTTP_CALL", "Server error", 500));

            assertThatThrownBy(() -> service.gradeSubmission(buildGradingRequest()))
                    .isInstanceOf(OpenAiException.class)
                    .satisfies(e -> assertThat(((OpenAiException) e).getHttpStatus()).isEqualTo(500));

            verify(gateway, times(1)).complete(any());
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private ChatCompletionResponse buildResponse(String content) {
        return new ChatCompletionResponse(
                "chatcmpl-test",
                List.of(new ChatCompletionResponse.Choice(
                        0,
                        new ChatCompletionResponse.Message("assistant", content),
                        "stop")),
                new ChatCompletionResponse.Usage(100, 200, 300));
    }

    private ExamGenerationRequest buildExamRequest() {
        return ExamGenerationRequest.builder()
                .subject("Biology")
                .topic("Photosynthesis")
                .gradeLevel("Grade 9")
                .questionCount(1)
                .difficultyLevel("MEDIUM")
                .build();
    }

    private GradingRequest buildGradingRequest() {
        return GradingRequest.builder()
                .submissionImageUrl("https://s3.amazonaws.com/bucket/submission.jpg")
                .questionNumber(1)
                .expectedAnswer("The mitochondria is the powerhouse of the cell")
                .pointsAvailable(new BigDecimal("5.00"))
                .build();
    }
}
