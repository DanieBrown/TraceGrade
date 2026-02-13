package com.tracegrade.validation;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;

import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class FileUploadValidator implements ConstraintValidator<ValidFileUpload, MultipartFile> {

    private static final byte[] JPEG_MAGIC = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_MAGIC = {(byte) 0x89, 0x50, 0x4E, 0x47};
    private static final byte[] PDF_MAGIC = {0x25, 0x50, 0x44, 0x46}; // %PDF
    private static final byte[] FTYP_MARKER = {0x66, 0x74, 0x79, 0x70}; // ftyp (HEIC)

    private long maxSizeBytes;

    @Override
    public void initialize(ValidFileUpload annotation) {
        this.maxSizeBytes = annotation.maxSizeBytes();
    }

    @Override
    public boolean isValid(MultipartFile file, ConstraintValidatorContext context) {
        if (file == null || file.isEmpty()) {
            return true; // Let @NotNull handle required-ness
        }

        context.disableDefaultConstraintViolation();

        if (file.getSize() > maxSizeBytes) {
            context.buildConstraintViolationWithTemplate(
                    "File size exceeds maximum of " + (maxSizeBytes / 1024 / 1024) + "MB")
                    .addConstraintViolation();
            return false;
        }

        try (InputStream is = file.getInputStream()) {
            byte[] header = new byte[12];
            int bytesRead = is.read(header);
            if (bytesRead < 4) {
                context.buildConstraintViolationWithTemplate("File is too small to identify")
                        .addConstraintViolation();
                return false;
            }
            if (!isAllowedFileType(header)) {
                context.buildConstraintViolationWithTemplate(
                        "File type not allowed. Accepted types: JPG, PNG, PDF, HEIC")
                        .addConstraintViolation();
                return false;
            }
        } catch (IOException e) {
            log.warn("Failed to read file for validation", e);
            context.buildConstraintViolationWithTemplate("Unable to validate file")
                    .addConstraintViolation();
            return false;
        }

        return true;
    }

    private boolean isAllowedFileType(byte[] header) {
        return startsWith(header, JPEG_MAGIC)
                || startsWith(header, PNG_MAGIC)
                || startsWith(header, PDF_MAGIC)
                || isHeic(header);
    }

    private boolean startsWith(byte[] data, byte[] prefix) {
        if (data.length < prefix.length) {
            return false;
        }
        return Arrays.equals(data, 0, prefix.length, prefix, 0, prefix.length);
    }

    private boolean isHeic(byte[] header) {
        if (header.length < 8) {
            return false;
        }
        return Arrays.equals(header, 4, 8, FTYP_MARKER, 0, 4);
    }
}
