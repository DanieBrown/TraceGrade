package com.tracegrade.grading;

/**
 * Thrown when an AI grading provider call fails.
 */
public class GradingProviderException extends RuntimeException {

    private final GradingProvider provider;

    public GradingProviderException(GradingProvider provider, String message) {
        super("[" + provider.name() + "] " + message);
        this.provider = provider;
    }

    public GradingProvider getProvider() {
        return provider;
    }
}