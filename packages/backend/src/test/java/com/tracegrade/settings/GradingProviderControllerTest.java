package com.tracegrade.settings;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tracegrade.exception.GlobalExceptionHandler;
import com.tracegrade.grading.GradingProvider;
import com.tracegrade.settings.dto.response.GradingProviderResponse;

@SuppressWarnings("null")
class GradingProviderControllerTest {

    private MockMvc mockMvc;
    private GradingProviderService gradingProviderService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        gradingProviderService = mock(GradingProviderService.class);
        GradingProviderController controller = new GradingProviderController(gradingProviderService);
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();

        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("GET returns the current grading provider and available options")
    void getCurrentProviderReturnsOk() throws Exception {
        UUID teacherId = UUID.randomUUID();
        GradingProviderResponse response = providerResponse(GradingProvider.GEMINI_FLASH);

        when(gradingProviderService.getCurrentProvider(any(Authentication.class))).thenReturn(response);

        mockMvc.perform(get("/api/settings/grading")
                        .principal(principal(teacherId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.currentProvider", is("GEMINI_FLASH")))
                .andExpect(jsonPath("$.data.availableProviders", hasSize(3)))
                .andExpect(jsonPath("$.data.availableProviders[0].id", is("GEMINI_FLASH")))
                .andExpect(jsonPath("$.data.availableProviders[1].id", is("OPENAI_GPT4O")))
                .andExpect(jsonPath("$.data.availableProviders[2].id", is("CLAUDE_SONNET")));

        verify(gradingProviderService).getCurrentProvider(any(Authentication.class));
    }

    @Test
    @DisplayName("PATCH returns 200 and updates the teacher grading provider")
    void updateProviderReturnsOk() throws Exception {
        UUID teacherId = UUID.randomUUID();
        GradingProviderResponse response = providerResponse(GradingProvider.CLAUDE_SONNET);

        when(gradingProviderService.updateProvider(any(Authentication.class), eq(GradingProvider.CLAUDE_SONNET)))
                .thenReturn(response);

        mockMvc.perform(patch("/api/settings/grading")
                        .principal(principal(teacherId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ProviderRequest("CLAUDE_SONNET"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.currentProvider", is("CLAUDE_SONNET")));

        verify(gradingProviderService)
                .updateProvider(any(Authentication.class), eq(GradingProvider.CLAUDE_SONNET));
    }

    @Test
    @DisplayName("PATCH returns 400 when provider is null")
    void updateProviderReturnsBadRequestForNullProvider() throws Exception {
        UUID teacherId = UUID.randomUUID();

        mockMvc.perform(patch("/api/settings/grading")
                        .principal(principal(teacherId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"provider\":null}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("VALIDATION_ERROR")));

        verifyNoInteractions(gradingProviderService);
    }

    @Test
    @DisplayName("PATCH returns 400 when the selected provider is not configured")
    void updateProviderReturnsBadRequestForUnconfiguredProvider() throws Exception {
        UUID teacherId = UUID.randomUUID();

        when(gradingProviderService.updateProvider(any(Authentication.class), eq(GradingProvider.CLAUDE_SONNET)))
                .thenThrow(new GradingProviderService.ProviderNotConfiguredApiException(GradingProvider.CLAUDE_SONNET));

        mockMvc.perform(patch("/api/settings/grading")
                        .principal(principal(teacherId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ProviderRequest("CLAUDE_SONNET"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("PROVIDER_NOT_CONFIGURED")));
    }

    private static Authentication principal(UUID teacherId) {
        return new UsernamePasswordAuthenticationToken(teacherId.toString(), "N/A", List.of());
    }

    private static GradingProviderResponse providerResponse(GradingProvider currentProvider) {
        return GradingProviderResponse.builder()
                .currentProvider(currentProvider)
                .availableProviders(List.of(
                        GradingProviderResponse.ProviderOption.builder()
                                .id(GradingProvider.GEMINI_FLASH)
                                .displayName("Gemini 2.0 Flash")
                                .description("Free — recommended")
                                .build(),
                        GradingProviderResponse.ProviderOption.builder()
                                .id(GradingProvider.OPENAI_GPT4O)
                                .displayName("GPT-4o")
                                .description("OpenAI — requires API key")
                                .build(),
                        GradingProviderResponse.ProviderOption.builder()
                                .id(GradingProvider.CLAUDE_SONNET)
                                .displayName("Claude Sonnet 4.6")
                                .description("Anthropic — requires API key")
                                .build()))
                .build();
    }

    private record ProviderRequest(String provider) {}
}