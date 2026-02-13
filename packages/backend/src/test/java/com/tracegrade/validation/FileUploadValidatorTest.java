package com.tracegrade.validation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.io.IOException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.ConstraintValidatorContext;

class FileUploadValidatorTest {

    private FileUploadValidator validator;
    private ConstraintValidatorContext context;
    private ConstraintValidatorContext.ConstraintViolationBuilder violationBuilder;

    @BeforeEach
    void setUp() {
        validator = new FileUploadValidator();
        ValidFileUpload annotation = mock(ValidFileUpload.class);
        when(annotation.maxSizeBytes()).thenReturn(10L * 1024 * 1024); // 10MB
        validator.initialize(annotation);

        context = mock(ConstraintValidatorContext.class);
        violationBuilder = mock(ConstraintValidatorContext.ConstraintViolationBuilder.class);
        when(context.buildConstraintViolationWithTemplate(anyString())).thenReturn(violationBuilder);
    }

    @Test
    @DisplayName("Should accept valid JPEG file")
    void shouldAcceptJpeg() throws IOException {
        byte[] jpegHeader = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0, 0, 0, 0, 0, 0, 0};
        MultipartFile file = createMockFile(jpegHeader, 1024);
        assertThat(validator.isValid(file, context)).isTrue();
    }

    @Test
    @DisplayName("Should accept valid PNG file")
    void shouldAcceptPng() throws IOException {
        byte[] pngHeader = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0};
        MultipartFile file = createMockFile(pngHeader, 2048);
        assertThat(validator.isValid(file, context)).isTrue();
    }

    @Test
    @DisplayName("Should accept valid PDF file")
    void shouldAcceptPdf() throws IOException {
        byte[] pdfHeader = {0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0, 0, 0, 0};
        MultipartFile file = createMockFile(pdfHeader, 4096);
        assertThat(validator.isValid(file, context)).isTrue();
    }

    @Test
    @DisplayName("Should accept valid HEIC file")
    void shouldAcceptHeic() throws IOException {
        byte[] heicHeader = {0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63};
        MultipartFile file = createMockFile(heicHeader, 8192);
        assertThat(validator.isValid(file, context)).isTrue();
    }

    @Test
    @DisplayName("Should reject file exceeding size limit")
    void shouldRejectOversizedFile() throws IOException {
        byte[] jpegHeader = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0, 0, 0, 0, 0, 0, 0};
        long oversized = 11L * 1024 * 1024; // 11MB
        MultipartFile file = createMockFile(jpegHeader, oversized);
        assertThat(validator.isValid(file, context)).isFalse();
    }

    @Test
    @DisplayName("Should reject file with unrecognized magic bytes")
    void shouldRejectUnknownType() throws IOException {
        byte[] unknownHeader = {0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0, 0, 0, 0};
        MultipartFile file = createMockFile(unknownHeader, 1024);
        assertThat(validator.isValid(file, context)).isFalse();
    }

    @Test
    @DisplayName("Should reject file that is too small to identify")
    void shouldRejectTinyFile() throws IOException {
        byte[] tinyData = {0x01, 0x02};
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getSize()).thenReturn(2L);
        when(file.getInputStream()).thenReturn(new ByteArrayInputStream(tinyData));
        assertThat(validator.isValid(file, context)).isFalse();
    }

    @Test
    @DisplayName("Should accept null file (delegates to @NotNull)")
    void shouldAcceptNull() {
        assertThat(validator.isValid(null, context)).isTrue();
    }

    @Test
    @DisplayName("Should accept empty file (delegates to @NotNull)")
    void shouldAcceptEmpty() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(true);
        assertThat(validator.isValid(file, context)).isTrue();
    }

    private MultipartFile createMockFile(byte[] header, long size) throws IOException {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getSize()).thenReturn(size);
        when(file.getInputStream()).thenReturn(new ByteArrayInputStream(header));
        return file;
    }
}
