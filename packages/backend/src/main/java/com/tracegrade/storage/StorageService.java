package com.tracegrade.storage;

/**
 * Abstraction for file storage operations.
 * Implementations include S3 (production) and local filesystem (dev/test).
 */
public interface StorageService {

    /**
     * Uploads a file and returns the storage key.
     *
     * @param type        the category of file being stored
     * @param fileName    the original file name
     * @param content     the file bytes
     * @param contentType the MIME content type (e.g. "application/pdf")
     * @return the storage key identifying the uploaded file
     */
    String upload(StorageType type, String fileName, byte[] content, String contentType);

    /**
     * Downloads a file by its storage key.
     *
     * @param key the storage key
     * @return the file bytes
     */
    byte[] download(String key);

    /**
     * Deletes a file by its storage key.
     *
     * @param key the storage key
     */
    void delete(String key);

    /**
     * Generates a presigned URL for direct file upload from the client.
     *
     * @param type        the category of file being stored
     * @param fileName    the original file name
     * @param contentType the MIME content type
     * @return a presigned PUT URL
     */
    String generatePresignedUploadUrl(StorageType type, String fileName, String contentType);

    /**
     * Generates a presigned URL for direct file download from the client.
     *
     * @param key the storage key
     * @return a presigned GET URL
     */
    String generatePresignedDownloadUrl(String key);

    /**
     * Checks whether a file exists at the given key.
     *
     * @param key the storage key
     * @return true if the file exists
     */
    boolean exists(String key);

    /**
     * Returns the full public URL for a stored file.
     *
     * @param key the storage key
     * @return the public URL
     */
    String getPublicUrl(String key);
}
