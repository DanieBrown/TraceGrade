package com.tracegrade.validation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

@Documented
@Constraint(validatedBy = FileUploadValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidFileUpload {

    String message() default "Invalid file upload";

    long maxSizeBytes() default 10 * 1024 * 1024; // 10MB

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
