package com.tracegrade.dto.response;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ApiResponseTest {

    @Test
    @DisplayName("Should create success response with data")
    void shouldCreateSuccessResponse() {
        ApiResponse<String> response = ApiResponse.success("test data");

        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData()).isEqualTo("test data");
        assertThat(response.getError()).isNull();
    }

    @Test
    @DisplayName("Should create error response with error details")
    void shouldCreateErrorResponse() {
        ApiError error = ApiError.of("TEST_ERROR", "Something went wrong");
        ApiResponse<Void> response = ApiResponse.error(error);

        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getData()).isNull();
        assertThat(response.getError()).isNotNull();
        assertThat(response.getError().getCode()).isEqualTo("TEST_ERROR");
        assertThat(response.getError().getMessage()).isEqualTo("Something went wrong");
    }

    @Test
    @DisplayName("Should create ApiError with timestamp")
    void shouldCreateErrorWithTimestamp() {
        ApiError error = ApiError.of("CODE", "msg");
        assertThat(error.getTimestamp()).isNotNull();
    }

    @Test
    @DisplayName("Should create ApiError with field details")
    void shouldCreateErrorWithDetails() {
        FieldError fieldError = FieldError.builder()
                .field("name")
                .code("NotBlank")
                .message("Name is required")
                .build();

        ApiError error = ApiError.withDetails("VALIDATION_ERROR", "Validation failed",
                List.of(fieldError));

        assertThat(error.getDetails()).hasSize(1);
        assertThat(error.getDetails().get(0).getField()).isEqualTo("name");
        assertThat(error.getDetails().get(0).getCode()).isEqualTo("NotBlank");
        assertThat(error.getDetails().get(0).getMessage()).isEqualTo("Name is required");
    }

    @Test
    @DisplayName("Should create ApiError without details")
    void shouldCreateErrorWithoutDetails() {
        ApiError error = ApiError.of("NOT_FOUND", "Resource not found");
        assertThat(error.getDetails()).isNull();
    }
}
