package com.tracegrade.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
@Schema(description = "Standard API envelope returned by all endpoints")
public class ApiResponse<T> {

    @Schema(description = "true when the request succeeded, false on error", example = "true")
    private final boolean success;

    @Schema(description = "Response payload; present only on success")
    private final T data;

    @Schema(description = "Error detail; present only on failure")
    private final ApiError error;

    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .build();
    }

    public static <T> ApiResponse<T> error(ApiError error) {
        return ApiResponse.<T>builder()
                .success(false)
                .error(error)
                .build();
    }
}
