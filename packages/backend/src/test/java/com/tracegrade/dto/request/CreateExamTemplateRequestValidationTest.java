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

class CreateExamTemplateRequestValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    private CreateExamTemplateRequest.CreateExamTemplateRequestBuilder validBuilder() {
        return CreateExamTemplateRequest.builder()
                .teacherId(UUID.randomUUID())
                .name("Math Exam")
                .totalPoints(new BigDecimal("100.00"))
                .questionsJson("[{\"q\":1}]");
    }

    @Test
    @DisplayName("Should pass validation with valid request")
    void shouldPassWithValidRequest() {
        var request = validBuilder().build();
        Set<ConstraintViolation<CreateExamTemplateRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Should fail when name is blank")
    void shouldFailWhenNameBlank() {
        var request = validBuilder().name("").build();
        Set<ConstraintViolation<CreateExamTemplateRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("name"));
    }

    @Test
    @DisplayName("Should fail when name is null")
    void shouldFailWhenNameNull() {
        var request = validBuilder().name(null).build();
        Set<ConstraintViolation<CreateExamTemplateRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("name"));
    }

    @Test
    @DisplayName("Should fail when name exceeds 200 characters")
    void shouldFailWhenNameTooLong() {
        var request = validBuilder().name("a".repeat(201)).build();
        Set<ConstraintViolation<CreateExamTemplateRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("name"));
    }

    @Test
    @DisplayName("Should accept name with exactly 200 characters")
    void shouldAcceptMaxLengthName() {
        var request = validBuilder().name("a".repeat(200)).build();
        Set<ConstraintViolation<CreateExamTemplateRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Should fail when teacherId is null")
    void shouldFailWhenTeacherIdNull() {
        var request = validBuilder().teacherId(null).build();
        Set<ConstraintViolation<CreateExamTemplateRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("teacherId"));
    }

    @Test
    @DisplayName("Should fail when totalPoints is null")
    void shouldFailWhenTotalPointsNull() {
        var request = validBuilder().totalPoints(null).build();
        Set<ConstraintViolation<CreateExamTemplateRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("totalPoints"));
    }

    @Test
    @DisplayName("Should fail when totalPoints is negative")
    void shouldFailWhenTotalPointsNegative() {
        var request = validBuilder().totalPoints(new BigDecimal("-1")).build();
        Set<ConstraintViolation<CreateExamTemplateRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("totalPoints"));
    }

    @Test
    @DisplayName("Should fail when totalPoints is zero")
    void shouldFailWhenTotalPointsZero() {
        var request = validBuilder().totalPoints(BigDecimal.ZERO).build();
        Set<ConstraintViolation<CreateExamTemplateRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("totalPoints"));
    }

    @Test
    @DisplayName("Should fail when questionsJson is blank")
    void shouldFailWhenQuestionsJsonBlank() {
        var request = validBuilder().questionsJson("").build();
        Set<ConstraintViolation<CreateExamTemplateRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("questionsJson"));
    }

    @Test
    @DisplayName("Should allow null subject")
    void shouldAllowNullSubject() {
        var request = validBuilder().subject(null).build();
        Set<ConstraintViolation<CreateExamTemplateRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Should fail when subject exceeds 100 characters")
    void shouldFailWhenSubjectTooLong() {
        var request = validBuilder().subject("a".repeat(101)).build();
        Set<ConstraintViolation<CreateExamTemplateRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("subject"));
    }
}
