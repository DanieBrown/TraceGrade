package com.tracegrade.imageprocessing;

public class PreprocessingException extends RuntimeException {

    private final String format;

    public PreprocessingException(String format, String message) {
        super(message);
        this.format = format;
    }

    public PreprocessingException(String format, String message, Throwable cause) {
        super(message, cause);
        this.format = format;
    }

    public String getFormat() {
        return format;
    }
}
