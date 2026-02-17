package com.tracegrade.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import com.tracegrade.exception.StorageException;

import java.nio.file.Path;

class LocalStorageServiceTest {

    private LocalStorageService service;

    @BeforeEach
    void setUp() {
        service = new LocalStorageService();
    }

    @Test
    @DisplayName("Should upload and download file successfully")
    void uploadAndDownload() {
        byte[] content = "hello world".getBytes();
        String key = service.upload(StorageType.EXAM_PDF, "test.pdf", content, "application/pdf");

        assertThat(key).startsWith("exams/");
        assertThat(key).endsWith("_test.pdf");

        byte[] downloaded = service.download(key);
        assertThat(downloaded).isEqualTo(content);
    }

    @Test
    @DisplayName("Should report file exists after upload")
    void existsAfterUpload() {
        String key = service.upload(StorageType.SUBMISSION_IMAGE, "photo.jpg", new byte[]{1, 2, 3}, "image/jpeg");

        assertThat(service.exists(key)).isTrue();
    }

    @Test
    @DisplayName("Should report file does not exist for unknown key")
    void doesNotExist() {
        assertThat(service.exists("nonexistent/key")).isFalse();
    }

    @Test
    @DisplayName("Should delete file successfully")
    void deleteFile() {
        String key = service.upload(StorageType.RUBRIC_IMAGE, "rubric.png", new byte[]{1}, "image/png");
        assertThat(service.exists(key)).isTrue();

        service.delete(key);
        assertThat(service.exists(key)).isFalse();
    }

    @Test
    @DisplayName("Should throw StorageException when downloading nonexistent file")
    void downloadNotFound() {
        assertThatThrownBy(() -> service.download("missing/file.pdf"))
                .isInstanceOf(StorageException.class)
                .hasMessageContaining("missing/file.pdf");
    }

    @Test
    @DisplayName("Should generate presigned download URL as file URI")
    void presignedDownloadUrl() {
        String key = service.upload(StorageType.EXAM_PDF, "exam.pdf", new byte[]{1}, "application/pdf");
        String url = service.generatePresignedDownloadUrl(key);

        assertThat(url).startsWith("file:");
    }

    @Test
    @DisplayName("Should generate presigned upload URL as file URI")
    void presignedUploadUrl() {
        String url = service.generatePresignedUploadUrl(StorageType.EXAM_PDF, "exam.pdf", "application/pdf");

        assertThat(url).startsWith("file:");
    }

    @Test
    @DisplayName("Should return file URI for public URL")
    void publicUrl() {
        String key = service.upload(StorageType.EXAM_PDF, "exam.pdf", new byte[]{1}, "application/pdf");
        String url = service.getPublicUrl(key);

        assertThat(url).startsWith("file:");
    }

    @Test
    @DisplayName("Should generate unique keys for same filename")
    void uniqueKeys() {
        String key1 = service.upload(StorageType.EXAM_PDF, "exam.pdf", new byte[]{1}, "application/pdf");
        String key2 = service.upload(StorageType.EXAM_PDF, "exam.pdf", new byte[]{2}, "application/pdf");

        assertThat(key1).isNotEqualTo(key2);
    }
}
