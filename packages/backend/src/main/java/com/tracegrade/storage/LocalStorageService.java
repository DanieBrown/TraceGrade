package com.tracegrade.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import com.tracegrade.exception.StorageException;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@ConditionalOnProperty(name = "storage.provider", havingValue = "local")
public class LocalStorageService implements StorageService {

    private final Path rootDir;

    public LocalStorageService() {
        this.rootDir = Path.of(System.getProperty("java.io.tmpdir"), "tracegrade-storage");
        try {
            Files.createDirectories(rootDir);
            log.info("Local storage initialized at {}", rootDir);
        } catch (IOException e) {
            throw new StorageException("INIT", "Failed to create local storage directory", e);
        }
    }

    @Override
    public String upload(StorageType type, String fileName, byte[] content, String contentType) {
        String key = generateKey(type, fileName);
        Path filePath = rootDir.resolve(key);

        try {
            Files.createDirectories(filePath.getParent());
            Files.write(filePath, content);
            log.info("Stored file locally at {} (size={})", filePath, content.length);
            return key;
        } catch (IOException e) {
            throw new StorageException("UPLOAD", "Failed to store file locally: " + fileName, e);
        }
    }

    @Override
    public byte[] download(String key) {
        Path filePath = rootDir.resolve(key);

        if (!Files.exists(filePath)) {
            throw new StorageException("DOWNLOAD", "File not found: " + key);
        }

        try {
            return Files.readAllBytes(filePath);
        } catch (IOException e) {
            throw new StorageException("DOWNLOAD", "Failed to read file: " + key, e);
        }
    }

    @Override
    public void delete(String key) {
        Path filePath = rootDir.resolve(key);

        try {
            Files.deleteIfExists(filePath);
            log.info("Deleted local file at {}", filePath);
        } catch (IOException e) {
            throw new StorageException("DELETE", "Failed to delete file: " + key, e);
        }
    }

    @Override
    public String generatePresignedUploadUrl(StorageType type, String fileName, String contentType) {
        String key = generateKey(type, fileName);
        return rootDir.resolve(key).toUri().toString();
    }

    @Override
    public String generatePresignedDownloadUrl(String key) {
        return rootDir.resolve(key).toUri().toString();
    }

    @Override
    public boolean exists(String key) {
        return Files.exists(rootDir.resolve(key));
    }

    @Override
    public String getPublicUrl(String key) {
        return rootDir.resolve(key).toUri().toString();
    }

    private String generateKey(StorageType type, String fileName) {
        String sanitized = fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
        return type.getKeyPrefix() + UUID.randomUUID() + "_" + sanitized;
    }
}
