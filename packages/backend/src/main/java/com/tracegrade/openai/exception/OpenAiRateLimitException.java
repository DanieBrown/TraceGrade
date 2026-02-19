package com.tracegrade.openai.exception;

/**
 * Thrown when the OpenAI API returns HTTP 429 and all retries have been exhausted.
 */
public class OpenAiRateLimitException extends OpenAiException {

    public OpenAiRateLimitException(String operation, int attemptsMade) {
        super(operation,
                "OpenAI rate limit exceeded after " + attemptsMade + " attempt(s)",
                429);
    }
}
