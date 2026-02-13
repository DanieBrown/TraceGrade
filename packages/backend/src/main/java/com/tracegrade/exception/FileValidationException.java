package com.tracegrade.exception;

public class FileValidationException extends RuntimeException {

    private final String field;
    private final String validationCode;

    public FileValidationException(String field, String validationCode, String message) {
        super(message);
        this.field = field;
        this.validationCode = validationCode;
    }

    public String getField() {
        return field;
    }

    public String getValidationCode() {
        return validationCode;
    }
}
