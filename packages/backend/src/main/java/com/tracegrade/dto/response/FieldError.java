package com.tracegrade.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class FieldError {

    private final String field;
    private final String code;
    private final String message;
}
