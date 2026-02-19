package com.tracegrade.openai.exception;

public class OpenAiException extends RuntimeException {

    private final String operation;
    private final int httpStatus;

    public OpenAiException(String operation, String message, int httpStatus) {
        super(message);
        this.operation = operation;
        this.httpStatus = httpStatus;
    }

    public OpenAiException(String operation, String message, int httpStatus, Throwable cause) {
        super(message, cause);
        this.operation = operation;
        this.httpStatus = httpStatus;
    }

    public String getOperation() {
        return operation;
    }

    public int getHttpStatus() {
        return httpStatus;
    }
}
