package com.tracegrade.exception;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import com.tracegrade.dto.response.ApiError;
import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.dto.response.FieldError;
import com.tracegrade.grading.GradingFailedException;
import com.tracegrade.openai.exception.OpenAiException;
import com.tracegrade.openai.exception.OpenAiRateLimitException;
import com.tracegrade.rubric.DuplicateQuestionNumberException;

import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationErrors(
            MethodArgumentNotValidException ex) {
        List<FieldError> details = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> FieldError.builder()
                        .field(fe.getField())
                        .code(fe.getCode())
                        .message(fe.getDefaultMessage())
                        .build())
                .toList();

        ApiError error = ApiError.withDetails(
                "VALIDATION_ERROR",
                "Request validation failed",
                details);

        return ResponseEntity.badRequest().body(ApiResponse.error(error));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(
            ConstraintViolationException ex) {
        List<FieldError> details = ex.getConstraintViolations().stream()
                .map(cv -> {
                    String path = cv.getPropertyPath().toString();
                    String field = path.contains(".") ? path.substring(path.lastIndexOf('.') + 1) : path;
                    return FieldError.builder()
                            .field(field)
                            .code("CONSTRAINT_VIOLATION")
                            .message(cv.getMessage())
                            .build();
                })
                .toList();

        ApiError error = ApiError.withDetails(
                "VALIDATION_ERROR",
                "Constraint violation",
                details);

        return ResponseEntity.badRequest().body(ApiResponse.error(error));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleMessageNotReadable(
            HttpMessageNotReadableException ex) {
        ApiError error = ApiError.of("INVALID_REQUEST", "Malformed request body");
        return ResponseEntity.badRequest().body(ApiResponse.error(error));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingParam(
            MissingServletRequestParameterException ex) {
        FieldError detail = FieldError.builder()
                .field(ex.getParameterName())
                .code("REQUIRED")
                .message("Parameter '" + ex.getParameterName() + "' is required")
                .build();

        ApiError error = ApiError.withDetails(
                "VALIDATION_ERROR",
                "Missing required parameter",
                List.of(detail));

        return ResponseEntity.badRequest().body(ApiResponse.error(error));
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<ApiResponse<Void>> handleMissingRequestPart(
            MissingServletRequestPartException ex) {
        FieldError detail = FieldError.builder()
                .field(ex.getRequestPartName())
                .code("REQUIRED")
                .message("Request part '" + ex.getRequestPartName() + "' is required")
                .build();

        ApiError error = ApiError.withDetails(
                "VALIDATION_ERROR",
                "Missing required request part",
                List.of(detail));

        return ResponseEntity.badRequest().body(ApiResponse.error(error));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex) {
        String requiredType = ex.getRequiredType() != null
                ? ex.getRequiredType().getSimpleName()
                : "unknown";
        FieldError detail = FieldError.builder()
                .field(ex.getName())
                .code("TYPE_MISMATCH")
                .message("Expected type: " + requiredType)
                .build();

        ApiError error = ApiError.withDetails(
                "VALIDATION_ERROR",
                "Invalid parameter type",
                List.of(detail));

        return ResponseEntity.badRequest().body(ApiResponse.error(error));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleMaxUploadSize(
            MaxUploadSizeExceededException ex) {
        ApiError error = ApiError.of(
                "FILE_TOO_LARGE",
                "File size exceeds maximum allowed upload size of 10MB");

        return ResponseEntity
                .status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(ApiResponse.error(error));
    }

    @ExceptionHandler(FileValidationException.class)
    public ResponseEntity<ApiResponse<Void>> handleFileValidation(
            FileValidationException ex) {
        FieldError detail = FieldError.builder()
                .field(ex.getField())
                .code(ex.getValidationCode())
                .message(ex.getMessage())
                .build();

        ApiError error = ApiError.withDetails(
                "FILE_VALIDATION_ERROR",
                "File validation failed",
                List.of(detail));

        return ResponseEntity.badRequest().body(ApiResponse.error(error));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(
            ResourceNotFoundException ex) {
        ApiError error = ApiError.of("NOT_FOUND", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(error));
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ApiResponse<Void>> handleDuplicateResource(
            DuplicateResourceException ex) {
        ApiError error = ApiError.of("CONFLICT", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(error));
    }

    @ExceptionHandler(InputSanitizationException.class)
    public ResponseEntity<ApiResponse<Void>> handleSanitizationRejection(
            InputSanitizationException ex) {
        ApiError error = ApiError.of("INVALID_INPUT", ex.getMessage());
        return ResponseEntity.badRequest().body(ApiResponse.error(error));
    }

    @ExceptionHandler(StorageException.class)
    public ResponseEntity<ApiResponse<Void>> handleStorageException(
            StorageException ex) {
        log.error("Storage operation [{}] failed: {}", ex.getOperation(), ex.getMessage(), ex);
        ApiError error = ApiError.of("STORAGE_ERROR", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_GATEWAY)
                .body(ApiResponse.error(error));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodNotAllowed(
            HttpRequestMethodNotSupportedException ex) {
        ApiError error = ApiError.of("METHOD_NOT_ALLOWED",
                "HTTP method " + ex.getMethod() + " is not supported for this endpoint");
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(ApiResponse.error(error));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResourceFound(
            NoResourceFoundException ex) {
        ApiError error = ApiError.of("NOT_FOUND", "The requested resource was not found");
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(error));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMediaTypeNotSupported(
            HttpMediaTypeNotSupportedException ex) {
        ApiError error = ApiError.of("UNSUPPORTED_MEDIA_TYPE",
                "Content type '" + ex.getContentType() + "' is not supported");
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(ApiResponse.error(error));
    }

    @ExceptionHandler(DuplicateQuestionNumberException.class)
    public ResponseEntity<ApiResponse<Void>> handleDuplicateQuestionNumber(
            DuplicateQuestionNumberException ex) {
        ApiError error = ApiError.of("DUPLICATE_QUESTION_NUMBER", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(error));
    }

    @ExceptionHandler(OpenAiRateLimitException.class)
    public ResponseEntity<ApiResponse<Void>> handleOpenAiRateLimit(
            OpenAiRateLimitException ex) {
        log.warn("OpenAI rate limit exhausted for operation [{}]: {}", ex.getOperation(), ex.getMessage());
        ApiError error = ApiError.of("AI_RATE_LIMIT", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(ApiResponse.error(error));
    }

    @ExceptionHandler(OpenAiException.class)
    public ResponseEntity<ApiResponse<Void>> handleOpenAiException(
            OpenAiException ex) {
        log.error("OpenAI API operation [{}] failed with status {}: {}",
                ex.getOperation(), ex.getHttpStatus(), ex.getMessage(), ex);
        ApiError error = ApiError.of("AI_ERROR", "AI service encountered an error");
        return ResponseEntity
                .status(HttpStatus.BAD_GATEWAY)
                .body(ApiResponse.error(error));
    }

    @ExceptionHandler(GradingFailedException.class)
    public ResponseEntity<ApiResponse<Void>> handleGradingFailed(GradingFailedException ex) {
        log.error("Grading failed for submissionId={}", ex.getSubmissionId(), ex);
        ApiError error = ApiError.of("GRADING_FAILED",
                "Grading could not be completed. The submission has been flagged for manual review.");
        return ResponseEntity
                .status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(ApiResponse.error(error));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        log.error("Unhandled exception", ex);
        ApiError error = ApiError.of("INTERNAL_ERROR", "An unexpected error occurred");
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(error));
    }
}
