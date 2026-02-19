package com.tracegrade.openai.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * A single content part in a vision-capable Chat Completions message.
 * Use the static factory methods to construct text or image parts.
 * Internal to the openai package — never exposed past the service boundary.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public record VisionMessageContent(
        String type,
        String text,
        @JsonProperty("image_url") ImageUrl imageUrl
) {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ImageUrl(String url, String detail) {}

    public static VisionMessageContent text(String text) {
        return new VisionMessageContent("text", text, null);
    }

    public static VisionMessageContent imageUrl(String url) {
        return new VisionMessageContent("image_url", null, new ImageUrl(url, "high"));
    }
}
