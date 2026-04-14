package com.tracegrade.grading;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.tracegrade.domain.model.User;
import com.tracegrade.domain.model.UserRole;
import com.tracegrade.domain.repository.UserRepository;
import com.tracegrade.openai.OpenAiService;
import com.tracegrade.openai.dto.GradingRequest;
import com.tracegrade.openai.dto.GradingResponse;

@SuppressWarnings("null")
class GradingProviderRouterTest {

    private OpenAiService openAiService;
    private GeminiGradingService geminiGradingService;
    private ClaudeSonnetGradingService claudeSonnetGradingService;
    private UserRepository userRepository;
    private GradingProviderRouter router;

    @BeforeEach
    void setUp() {
        openAiService = mock(OpenAiService.class);
        geminiGradingService = mock(GeminiGradingService.class);
        claudeSonnetGradingService = mock(ClaudeSonnetGradingService.class);
        userRepository = mock(UserRepository.class);
        router = new GradingProviderRouter(openAiService, geminiGradingService, claudeSonnetGradingService, userRepository);
    }

    @Test
    @DisplayName("Routes grading to the teacher's configured provider")
    void routesToConfiguredProvider() {
        UUID teacherId = UUID.randomUUID();
        GradingRequest request = request();
        GradingResponse expected = response(1, 0.88);
        User teacher = User.builder()
                .email("teacher@test.com")
                .passwordHash("hash")
                .firstName("Ada")
                .lastName("Teacher")
                .role(UserRole.TEACHER)
                .isActive(true)
                .build();
        teacher.setId(teacherId);
        teacher.setGradingProvider(GradingProvider.OPENAI_GPT4O);

        when(userRepository.findByIdAndRoleAndIsActiveTrue(teacherId, UserRole.TEACHER)).thenReturn(Optional.of(teacher));
        when(openAiService.gradeSubmission(request)).thenReturn(expected);

        GradingResponse actual = router.gradeSubmission(teacherId, request);

        assertThat(actual).isSameAs(expected);
        verify(openAiService).gradeSubmission(request);
        verify(geminiGradingService, never()).gradeSubmission(any());
        verify(claudeSonnetGradingService, never()).gradeSubmission(any());
    }

    @Test
    @DisplayName("Defaults to Gemini when the teacher cannot be resolved")
    void defaultsToGeminiWhenTeacherMissing() {
        UUID teacherId = UUID.randomUUID();
        GradingRequest request = request();
        GradingResponse expected = response(1, 0.91);

        when(userRepository.findByIdAndRoleAndIsActiveTrue(eq(teacherId), eq(UserRole.TEACHER)))
                .thenReturn(Optional.empty());
        when(geminiGradingService.gradeSubmission(request)).thenReturn(expected);

        GradingResponse actual = router.gradeSubmission(teacherId, request);

        assertThat(actual).isSameAs(expected);
        verify(geminiGradingService).gradeSubmission(request);
        verify(openAiService, never()).gradeSubmission(any());
        verify(claudeSonnetGradingService, never()).gradeSubmission(any());
    }

    private static GradingRequest request() {
        return GradingRequest.builder()
                .submissionImageUrl("https://example.com/submission.jpg")
                .questionNumber(1)
                .expectedAnswer("42")
                .pointsAvailable(new BigDecimal("5.00"))
                .build();
    }

    private static GradingResponse response(int questionNumber, double confidenceScore) {
        return GradingResponse.builder()
                .questionNumber(questionNumber)
                .pointsAwarded(new BigDecimal("4.50"))
                .pointsAvailable(new BigDecimal("5.00"))
                .confidenceScore(confidenceScore)
                .feedback("Good work")
                .illegible(false)
                .build();
    }
}