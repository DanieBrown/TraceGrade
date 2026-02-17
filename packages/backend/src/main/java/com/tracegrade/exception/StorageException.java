package com.tracegrade.exception;

public class StorageException extends RuntimeException {

    private final String operation;

    public StorageException(String operation, String message) {
        super(message);
        this.operation = operation;
    }

    public StorageException(String operation, String message, Throwable cause) {
        super(message, cause);
        this.operation = operation;
    }

    public String getOperation() {
        return operation;
    }
}
