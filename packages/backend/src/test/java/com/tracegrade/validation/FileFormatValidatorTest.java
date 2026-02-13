package com.tracegrade.validation;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import jakarta.validation.ConstraintValidatorContext;
import org.mockito.Mockito;

class FileFormatValidatorTest {

    private FileFormatValidator validator;
    private ConstraintValidatorContext context;

    @BeforeEach
    void setUp() {
        validator = new FileFormatValidator();
        context = Mockito.mock(ConstraintValidatorContext.class);
    }

    @Test
    @DisplayName("Should accept jpg format")
    void shouldAcceptJpg() {
        assertThat(validator.isValid("jpg", context)).isTrue();
    }

    @Test
    @DisplayName("Should accept png format")
    void shouldAcceptPng() {
        assertThat(validator.isValid("png", context)).isTrue();
    }

    @Test
    @DisplayName("Should accept pdf format")
    void shouldAcceptPdf() {
        assertThat(validator.isValid("pdf", context)).isTrue();
    }

    @Test
    @DisplayName("Should accept heic format")
    void shouldAcceptHeic() {
        assertThat(validator.isValid("heic", context)).isTrue();
    }

    @Test
    @DisplayName("Should accept format case-insensitively")
    void shouldAcceptCaseInsensitive() {
        assertThat(validator.isValid("JPG", context)).isTrue();
        assertThat(validator.isValid("Png", context)).isTrue();
        assertThat(validator.isValid("PDF", context)).isTrue();
        assertThat(validator.isValid("HEIC", context)).isTrue();
    }

    @Test
    @DisplayName("Should reject gif format")
    void shouldRejectGif() {
        assertThat(validator.isValid("gif", context)).isFalse();
    }

    @Test
    @DisplayName("Should reject bmp format")
    void shouldRejectBmp() {
        assertThat(validator.isValid("bmp", context)).isFalse();
    }

    @Test
    @DisplayName("Should reject exe format")
    void shouldRejectExe() {
        assertThat(validator.isValid("exe", context)).isFalse();
    }

    @Test
    @DisplayName("Should reject empty string")
    void shouldRejectEmpty() {
        assertThat(validator.isValid("", context)).isFalse();
    }

    @Test
    @DisplayName("Should accept null value (delegates to @NotBlank)")
    void shouldAcceptNull() {
        assertThat(validator.isValid(null, context)).isTrue();
    }

    @Test
    @DisplayName("Should handle whitespace-padded format")
    void shouldHandleWhitespacePadded() {
        assertThat(validator.isValid(" jpg ", context)).isTrue();
    }
}
