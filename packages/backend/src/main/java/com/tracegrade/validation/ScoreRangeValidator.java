package com.tracegrade.validation;

import java.math.BigDecimal;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class ScoreRangeValidator implements ConstraintValidator<ValidScoreRange, BigDecimal> {

    private BigDecimal min;
    private BigDecimal max;

    @Override
    public void initialize(ValidScoreRange annotation) {
        this.min = BigDecimal.valueOf(annotation.min());
        this.max = BigDecimal.valueOf(annotation.max());
    }

    @Override
    public boolean isValid(BigDecimal value, ConstraintValidatorContext context) {
        if (value == null) {
            return true; // Let @NotNull handle null
        }
        return value.compareTo(min) >= 0 && value.compareTo(max) <= 0;
    }
}
