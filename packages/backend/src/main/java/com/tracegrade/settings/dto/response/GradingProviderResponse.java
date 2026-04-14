package com.tracegrade.settings.dto.response;

import java.util.List;

import com.tracegrade.grading.GradingProvider;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GradingProviderResponse {

    private GradingProvider currentProvider;
    private List<ProviderOption> availableProviders;

    @Data
    @Builder
    public static class ProviderOption {
        private GradingProvider id;
        private String displayName;
        private String description;
    }
}