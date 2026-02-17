package com.tracegrade.storage;

import java.time.Duration;
import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import com.tracegrade.exception.StorageException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.model.ServerSideEncryption;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "storage.provider", havingValue = "s3", matchIfMissing = true)
public class S3StorageService implements StorageService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final StorageProperties properties;

    @Override
    public String upload(StorageType type, String fileName, byte[] content, String contentType) {
        String key = generateKey(type, fileName);
        String bucket = properties.getS3().getBucketName();

        try {
            PutObjectRequest request = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(contentType)
                    .serverSideEncryption(ServerSideEncryption.AES256)
                    .build();

            s3Client.putObject(request, RequestBody.fromBytes(content));
            log.info("Uploaded file to s3://{}/{} (type={}, size={})", bucket, key, contentType, content.length);
            return key;
        } catch (S3Exception e) {
            log.error("Failed to upload file to s3://{}/{}", bucket, key, e);
            throw new StorageException("UPLOAD", "Failed to upload file: " + fileName, e);
        }
    }

    @Override
    public byte[] download(String key) {
        String bucket = properties.getS3().getBucketName();

        try {
            GetObjectRequest request = GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build();

            byte[] content = s3Client.getObjectAsBytes(request).asByteArray();
            log.debug("Downloaded file from s3://{}/{} (size={})", bucket, key, content.length);
            return content;
        } catch (NoSuchKeyException e) {
            log.warn("File not found: s3://{}/{}", bucket, key);
            throw new StorageException("DOWNLOAD", "File not found: " + key, e);
        } catch (S3Exception e) {
            log.error("Failed to download file from s3://{}/{}", bucket, key, e);
            throw new StorageException("DOWNLOAD", "Failed to download file: " + key, e);
        }
    }

    @Override
    public void delete(String key) {
        String bucket = properties.getS3().getBucketName();

        try {
            DeleteObjectRequest request = DeleteObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build();

            s3Client.deleteObject(request);
            log.info("Deleted file from s3://{}/{}", bucket, key);
        } catch (S3Exception e) {
            log.error("Failed to delete file from s3://{}/{}", bucket, key, e);
            throw new StorageException("DELETE", "Failed to delete file: " + key, e);
        }
    }

    @Override
    public String generatePresignedUploadUrl(StorageType type, String fileName, String contentType) {
        String key = generateKey(type, fileName);
        String bucket = properties.getS3().getBucketName();
        Duration expiration = Duration.ofMinutes(properties.getS3().getPresignedUrlExpirationMinutes());

        try {
            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .contentType(contentType)
                    .serverSideEncryption(ServerSideEncryption.AES256)
                    .build();

            PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                    .signatureDuration(expiration)
                    .putObjectRequest(putRequest)
                    .build();

            String url = s3Presigner.presignPutObject(presignRequest).url().toString();
            log.debug("Generated presigned upload URL for key={}", key);
            return url;
        } catch (S3Exception e) {
            log.error("Failed to generate presigned upload URL for key={}", key, e);
            throw new StorageException("PRESIGN_UPLOAD", "Failed to generate upload URL", e);
        }
    }

    @Override
    public String generatePresignedDownloadUrl(String key) {
        String bucket = properties.getS3().getBucketName();
        Duration expiration = Duration.ofMinutes(properties.getS3().getPresignedUrlExpirationMinutes());

        try {
            GetObjectRequest getRequest = GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build();

            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(expiration)
                    .getObjectRequest(getRequest)
                    .build();

            String url = s3Presigner.presignGetObject(presignRequest).url().toString();
            log.debug("Generated presigned download URL for key={}", key);
            return url;
        } catch (S3Exception e) {
            log.error("Failed to generate presigned download URL for key={}", key, e);
            throw new StorageException("PRESIGN_DOWNLOAD", "Failed to generate download URL", e);
        }
    }

    @Override
    public boolean exists(String key) {
        String bucket = properties.getS3().getBucketName();

        try {
            HeadObjectRequest request = HeadObjectRequest.builder()
                    .bucket(bucket)
                    .key(key)
                    .build();

            s3Client.headObject(request);
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (S3Exception e) {
            log.error("Failed to check existence of s3://{}/{}", bucket, key, e);
            throw new StorageException("EXISTS", "Failed to check file existence: " + key, e);
        }
    }

    @Override
    public String getPublicUrl(String key) {
        StorageProperties.S3 s3Props = properties.getS3();
        if (s3Props.getEndpoint() != null && !s3Props.getEndpoint().isBlank()) {
            return s3Props.getEndpoint() + "/" + s3Props.getBucketName() + "/" + key;
        }
        return "https://" + s3Props.getBucketName() + ".s3." + s3Props.getRegion() + ".amazonaws.com/" + key;
    }

    String generateKey(StorageType type, String fileName) {
        String prefix = properties.getS3().getPathPrefix();
        String sanitized = fileName.replaceAll("[^a-zA-Z0-9._-]", "_");
        return prefix + type.getKeyPrefix() + UUID.randomUUID() + "_" + sanitized;
    }
}
