package com.tracegrade.grading;

import java.util.UUID;

import org.springframework.stereotype.Service;

import com.tracegrade.domain.model.User;
import com.tracegrade.domain.model.UserRole;
import com.tracegrade.domain.repository.UserRepository;
import com.tracegrade.openai.OpenAiService;
import com.tracegrade.openai.dto.GradingRequest;
import com.tracegrade.openai.dto.GradingResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Routes grading requests to the provider saved on the teacher record.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GradingProviderRouter {

    private final OpenAiService openAiService;
    private final GeminiGradingService geminiGradingService;
    private final ClaudeSonnetGradingService claudeSonnetGradingService;
    private final UserRepository userRepository;

    public GradingResponse gradeSubmission(UUID teacherId, GradingRequest request) {
        GradingProvider provider = resolveProvider(teacherId);
        log.debug("Routing grading for questionNumber={} to provider={} (teacherId={})",
                request.getQuestionNumber(), provider, teacherId);

        return switch (provider) {
            case GEMINI_FLASH -> geminiGradingService.gradeSubmission(request);
            case OPENAI_GPT4O -> openAiService.gradeSubmission(request);
            case CLAUDE_SONNET -> claudeSonnetGradingService.gradeSubmission(request);
        };
    }

    private GradingProvider resolveProvider(UUID teacherId) {
        if (teacherId == null) {
            return GradingProvider.GEMINI_FLASH;
        }

        return userRepository.findByIdAndRoleAndIsActiveTrue(teacherId, UserRole.TEACHER)
                .map(User::getGradingProvider)
                .orElseGet(() -> {
                    log.warn("Teacher not found for teacherId={} while resolving grading provider; defaulting to GEMINI_FLASH", teacherId);
                    return GradingProvider.GEMINI_FLASH;
                });
    }
}