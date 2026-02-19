package com.tracegrade.openai.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Raw OpenAI Chat Completions API request shape.
 * Internal to the openai package — never exposed past the service boundary.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ChatCompletionRequest(
        String model,
        List<Message> messages,
        @JsonProperty("max_tokens") int maxTokens,
        double temperature,
        @JsonProperty("response_format") ResponseFormat responseFormat
) {

    public record Message(String role, Object content) {}

    public record ResponseFormat(String type) {
        public static ResponseFormat json() {
            return new ResponseFormat("json_object");
        }
    }
}
