package com.tracegrade.dto.request;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

class CreateGradingResultRequestValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    private CreateGradingResultRequest.CreateGradingResultRequestBuilder validBuilder() {
        return CreateGradingResultRequest.builder()
                .submissionId(UUID.randomUUID())
                .aiScore(new BigDecimal("85.50"))
                .confidenceScore(new BigDecimal("95.00"))
                .questionScores("[{\"q\":1,\"score\":10}]");
    }

    @Test
    @DisplayName("Should pass validation with valid request")
    void shouldPassWithValidRequest() {
        var request = validBuilder().build();
        Set<ConstraintViolation<CreateGradingResultRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Should fail when submissionId is null")
    void shouldFailWhenSubmissionIdNull() {
        var request = validBuilder().submissionId(null).build();
        Set<ConstraintViolation<CreateGradingResultRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("submissionId"));
    }

    @Test
    @DisplayName("Should fail when aiScore is negative")
    void shouldFailWhenAiScoreNegative() {
        var request = validBuilder().aiScore(new BigDecimal("-1")).build();
        Set<ConstraintViolation<CreateGradingResultRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("aiScore"));
    }

    @Test
    @DisplayName("Should accept aiScore of zero")
    void shouldAcceptAiScoreZero() {
        var request = validBuilder().aiScore(BigDecimal.ZERO).build();
        Set<ConstraintViolation<CreateGradingResultRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Should fail when confidenceScore is null")
    void shouldFailWhenConfidenceScoreNull() {
        var request = validBuilder().confidenceScore(null).build();
        Set<ConstraintViolation<CreateGradingResultRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("confidenceScore"));
    }

    @Test
    @DisplayName("Should fail when confidenceScore exceeds 100")
    void shouldFailWhenConfidenceScoreAbove100() {
        var request = validBuilder().confidenceScore(new BigDecimal("100.01")).build();
        Set<ConstraintViolation<CreateGradingResultRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("confidenceScore"));
    }

    @Test
    @DisplayName("Should fail when confidenceScore is negative")
    void shouldFailWhenConfidenceScoreNegative() {
        var request = validBuilder().confidenceScore(new BigDecimal("-0.01")).build();
        Set<ConstraintViolation<CreateGradingResultRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("confidenceScore"));
    }

    @Test
    @DisplayName("Should accept confidenceScore boundary values")
    void shouldAcceptBoundaryValues() {
        var request0 = validBuilder().confidenceScore(BigDecimal.ZERO).build();
        assertThat(validator.validate(request0)).isEmpty();

        var request100 = validBuilder().confidenceScore(new BigDecimal("100")).build();
        assertThat(validator.validate(request100)).isEmpty();
    }

    @Test
    @DisplayName("Should fail when questionScores is blank")
    void shouldFailWhenQuestionScoresBlank() {
        var request = validBuilder().questionScores("").build();
        Set<ConstraintViolation<CreateGradingResultRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("questionScores"));
    }

    @Test
    @DisplayName("Should allow null aiFeedback")
    void shouldAllowNullFeedback() {
        var request = validBuilder().aiFeedback(null).build();
        Set<ConstraintViolation<CreateGradingResultRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }
}
