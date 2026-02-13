package com.tracegrade.dto.request;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

class CreateStudentSubmissionRequestValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    private CreateStudentSubmissionRequest.CreateStudentSubmissionRequestBuilder validBuilder() {
        return CreateStudentSubmissionRequest.builder()
                .assignmentId(UUID.randomUUID())
                .studentId(UUID.randomUUID())
                .submissionImageUrls("[\"https://s3.example.com/img.jpg\"]")
                .originalFormat("jpg");
    }

    @Test
    @DisplayName("Should pass validation with valid request")
    void shouldPassWithValidRequest() {
        var request = validBuilder().build();
        Set<ConstraintViolation<CreateStudentSubmissionRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Should fail when assignmentId is null")
    void shouldFailWhenAssignmentIdNull() {
        var request = validBuilder().assignmentId(null).build();
        Set<ConstraintViolation<CreateStudentSubmissionRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("assignmentId"));
    }

    @Test
    @DisplayName("Should fail when studentId is null")
    void shouldFailWhenStudentIdNull() {
        var request = validBuilder().studentId(null).build();
        Set<ConstraintViolation<CreateStudentSubmissionRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("studentId"));
    }

    @Test
    @DisplayName("Should fail when submissionImageUrls is blank")
    void shouldFailWhenImageUrlsBlank() {
        var request = validBuilder().submissionImageUrls("").build();
        Set<ConstraintViolation<CreateStudentSubmissionRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("submissionImageUrls"));
    }

    @Test
    @DisplayName("Should fail when originalFormat is blank")
    void shouldFailWhenFormatBlank() {
        var request = validBuilder().originalFormat("").build();
        Set<ConstraintViolation<CreateStudentSubmissionRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("originalFormat"));
    }

    @Test
    @DisplayName("Should fail when originalFormat is invalid")
    void shouldFailWhenFormatInvalid() {
        var request = validBuilder().originalFormat("gif").build();
        Set<ConstraintViolation<CreateStudentSubmissionRequest>> violations = validator.validate(request);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("originalFormat"));
    }

    @Test
    @DisplayName("Should accept all valid file formats")
    void shouldAcceptAllValidFormats() {
        for (String format : new String[]{"jpg", "png", "pdf", "heic"}) {
            var request = validBuilder().originalFormat(format).build();
            Set<ConstraintViolation<CreateStudentSubmissionRequest>> violations = validator.validate(request);
            assertThat(violations).as("Format '%s' should be valid", format).isEmpty();
        }
    }
}
