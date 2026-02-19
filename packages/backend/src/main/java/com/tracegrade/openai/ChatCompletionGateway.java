package com.tracegrade.openai;

import com.tracegrade.openai.model.ChatCompletionRequest;
import com.tracegrade.openai.model.ChatCompletionResponse;

/**
 * Functional interface wrapping the OpenAI Chat Completions HTTP call.
 * Keeping it as a separate interface makes the service fully mockable
 * in unit tests without needing to stub RestClient's fluent builder chain.
 */
@FunctionalInterface
public interface ChatCompletionGateway {

    ChatCompletionResponse complete(ChatCompletionRequest request);
}
