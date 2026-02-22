package com.tracegrade.dto.response;

import java.time.Instant;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
@Schema(description = "Error detail returned inside ApiResponse when success=false")
public class ApiError {

    @Schema(description = "Machine-readable error code", example = "VALIDATION_ERROR")
    private final String code;

    @Schema(description = "Human-readable error description", example = "Request validation failed")
    private final String message;

    @Schema(description = "Per-field validation errors; present only for 400 responses")
    private final List<FieldError> details;

    @Schema(description = "UTC timestamp when the error occurred", example = "2024-01-15T10:30:00Z")
    private final Instant timestamp;

    public static ApiError of(String code, String message) {
        return ApiError.builder()
                .code(code)
                .message(message)
                .timestamp(Instant.now())
                .build();
    }

    public static ApiError withDetails(String code, String message, List<FieldError> details) {
        return ApiError.builder()
                .code(code)
                .message(message)
                .details(details)
                .timestamp(Instant.now())
                .build();
    }
}
