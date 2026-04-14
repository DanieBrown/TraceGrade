package com.tracegrade.settings.dto.request;

import com.tracegrade.grading.GradingProvider;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateGradingProviderRequest {

    @NotNull(message = "provider must not be null")
    private GradingProvider provider;
}