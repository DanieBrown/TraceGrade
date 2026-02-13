package com.tracegrade.validation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import jakarta.validation.ConstraintValidatorContext;

class ScoreRangeValidatorTest {

    private ScoreRangeValidator validator;
    private ConstraintValidatorContext context;

    @BeforeEach
    void setUp() {
        validator = new ScoreRangeValidator();
        ValidScoreRange annotation = mock(ValidScoreRange.class);
        when(annotation.min()).thenReturn(0.0);
        when(annotation.max()).thenReturn(100.0);
        validator.initialize(annotation);
        context = mock(ConstraintValidatorContext.class);
    }

    @Test
    @DisplayName("Should accept score of 0")
    void shouldAcceptZero() {
        assertThat(validator.isValid(BigDecimal.ZERO, context)).isTrue();
    }

    @Test
    @DisplayName("Should accept score of 100")
    void shouldAcceptHundred() {
        assertThat(validator.isValid(new BigDecimal("100"), context)).isTrue();
    }

    @Test
    @DisplayName("Should accept score of 50")
    void shouldAcceptFifty() {
        assertThat(validator.isValid(new BigDecimal("50"), context)).isTrue();
    }

    @Test
    @DisplayName("Should accept score of 99.99")
    void shouldAcceptNinetyNinePointNine() {
        assertThat(validator.isValid(new BigDecimal("99.99"), context)).isTrue();
    }

    @Test
    @DisplayName("Should reject negative score")
    void shouldRejectNegative() {
        assertThat(validator.isValid(new BigDecimal("-1"), context)).isFalse();
    }

    @Test
    @DisplayName("Should reject score above 100")
    void shouldRejectAboveMax() {
        assertThat(validator.isValid(new BigDecimal("100.01"), context)).isFalse();
    }

    @Test
    @DisplayName("Should reject score of -0.01")
    void shouldRejectSlightlyNegative() {
        assertThat(validator.isValid(new BigDecimal("-0.01"), context)).isFalse();
    }

    @Test
    @DisplayName("Should accept null value (delegates to @NotNull)")
    void shouldAcceptNull() {
        assertThat(validator.isValid(null, context)).isTrue();
    }
}
