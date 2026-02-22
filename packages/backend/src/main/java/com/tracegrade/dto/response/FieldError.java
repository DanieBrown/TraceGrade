package com.tracegrade.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
@Schema(description = "Validation error detail for a single request field")
public class FieldError {

    @Schema(description = "Name of the field that failed validation", example = "email")
    private final String field;

    @Schema(description = "Validation constraint code", example = "NotBlank")
    private final String code;

    @Schema(description = "Human-readable validation message", example = "must not be blank")
    private final String message;
}
