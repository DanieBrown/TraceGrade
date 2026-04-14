package com.tracegrade.grading;

/**
 * Thrown when a teacher selects a grading provider whose API key is not configured.
 */
public class ProviderNotConfiguredException extends RuntimeException {

    private final GradingProvider provider;

    public ProviderNotConfiguredException(GradingProvider provider) {
        super("Grading provider " + provider.name() + " is not configured - missing API key");
        this.provider = provider;
    }

    public GradingProvider getProvider() {
        return provider;
    }
}