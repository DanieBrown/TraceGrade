package com.tracegrade.validation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

@Documented
@Constraint(validatedBy = ScoreRangeValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidScoreRange {

    String message() default "Score must be between {min} and {max}";

    double min() default 0;

    double max() default 100;

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
