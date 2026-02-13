package com.tracegrade.validation;

import java.util.Set;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class FileFormatValidator implements ConstraintValidator<ValidFileFormat, String> {

    private static final Set<String> ALLOWED_FORMATS = Set.of("jpg", "png", "pdf", "heic");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return true; // Let @NotBlank handle null
        }
        return ALLOWED_FORMATS.contains(value.toLowerCase().trim());
    }
}
