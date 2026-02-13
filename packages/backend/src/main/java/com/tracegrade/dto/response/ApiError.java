package com.tracegrade.dto.response;

import java.time.Instant;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class ApiError {

    private final String code;
    private final String message;
    private final List<FieldError> details;
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
