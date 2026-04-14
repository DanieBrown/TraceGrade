package com.tracegrade.settings;

import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tracegrade.domain.model.User;
import com.tracegrade.domain.model.UserRole;
import com.tracegrade.domain.repository.UserRepository;
import com.tracegrade.exception.ResourceNotFoundException;
import com.tracegrade.grading.GradingProvider;
import com.tracegrade.settings.dto.response.GradingProviderResponse;
import com.tracegrade.settings.dto.response.GradingProviderResponse.ProviderOption;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class GradingProviderService {

    private static final List<ProviderOption> AVAILABLE_PROVIDERS = List.of(
            ProviderOption.builder()
                    .id(GradingProvider.GEMINI_FLASH)
                    .displayName("Gemini 2.0 Flash")
                    .description("Free - recommended")
                    .build(),
            ProviderOption.builder()
                    .id(GradingProvider.OPENAI_GPT4O)
                    .displayName("GPT-4o")
                    .description("OpenAI - requires API key")
                    .build(),
            ProviderOption.builder()
                    .id(GradingProvider.CLAUDE_SONNET)
                    .displayName("Claude Sonnet 4.6")
                    .description("Anthropic - requires API key")
                    .build()
    );

    private final UserRepository userRepository;

    @Value("${GEMINI_API_KEY:}")
    private String geminiApiKey;

    @Value("${OPENAI_API_KEY:}")
    private String openAiApiKey;

    @Value("${ANTHROPIC_API_KEY:}")
    private String anthropicApiKey;

    @Transactional(readOnly = true)
    public GradingProviderResponse getCurrentProvider(Authentication authentication) {
        User teacher = getAuthenticatedTeacher(authentication);
        return buildResponse(teacher.getGradingProvider());
    }

    @Transactional
    public GradingProviderResponse updateProvider(Authentication authentication, GradingProvider provider) {
        validateProviderConfigured(provider);
        User teacher = getAuthenticatedTeacher(authentication);
        teacher.setGradingProvider(provider);
        userRepository.save(teacher);
        log.info("Teacher {} updated grading provider to {}", teacher.getId(), provider);
        return buildResponse(provider);
    }

    private void validateProviderConfigured(GradingProvider provider) {
        boolean configured = switch (provider) {
            case GEMINI_FLASH -> geminiApiKey != null && !geminiApiKey.isBlank();
            case OPENAI_GPT4O -> openAiApiKey != null && !openAiApiKey.isBlank();
            case CLAUDE_SONNET -> anthropicApiKey != null && !anthropicApiKey.isBlank();
        };

        if (!configured) {
            log.warn("Teacher attempted to select provider {} but corresponding API key is not configured", provider);
            throw new ProviderNotConfiguredApiException(provider);
        }
    }

    private GradingProviderResponse buildResponse(GradingProvider current) {
        return GradingProviderResponse.builder()
                .currentProvider(current)
                .availableProviders(AVAILABLE_PROVIDERS)
                .build();
    }

    private User getAuthenticatedTeacher(Authentication authentication) {
        UUID teacherId = resolveTeacherId(authentication);
        return userRepository.findByIdAndRoleAndIsActiveTrue(teacherId, UserRole.TEACHER)
                .orElseThrow(() -> new ResourceNotFoundException("User", teacherId));
    }

    private UUID resolveTeacherId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Authentication is required");
        }
        try {
            return UUID.fromString(authentication.getName());
        } catch (IllegalArgumentException e) {
            throw new AccessDeniedException("Authenticated principal does not contain a valid teacher identifier");
        }
    }

    public static class ProviderNotConfiguredApiException extends RuntimeException {
        private final GradingProvider provider;

        public ProviderNotConfiguredApiException(GradingProvider provider) {
            super("PROVIDER_NOT_CONFIGURED: " + provider.name() + " requires an API key that is not set");
            this.provider = provider;
        }

        public GradingProvider getProvider() {
            return provider;
        }
    }
}