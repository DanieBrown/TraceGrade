package com.tracegrade.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.net.URI;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import com.tracegrade.exception.StorageException;

import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.model.ServerSideEncryption;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@ExtendWith(MockitoExtension.class)
class S3StorageServiceTest {

    private S3Client s3Client;
    private S3Presigner s3Presigner;
    private StorageProperties properties;
    private S3StorageService service;

    @BeforeEach
    void setUp() {
        s3Client = mock(S3Client.class);
        s3Presigner = mock(S3Presigner.class);
        properties = new StorageProperties();
        properties.getS3().setBucketName("test-bucket");
        properties.getS3().setRegion("us-east-1");
        properties.getS3().setPathPrefix("");

        service = new S3StorageService(s3Client, s3Presigner, properties);
    }

    @Nested
    @DisplayName("Upload")
    class UploadTests {

        @Test
        @DisplayName("Should upload file with correct bucket, content type, and encryption")
        void uploadSuccessfully() {
            byte[] content = "test content".getBytes();
            when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                    .thenReturn(PutObjectResponse.builder().build());

            String key = service.upload(StorageType.EXAM_PDF, "exam.pdf", content, "application/pdf");

            ArgumentCaptor<PutObjectRequest> captor = ArgumentCaptor.forClass(PutObjectRequest.class);
            verify(s3Client).putObject(captor.capture(), any(RequestBody.class));

            PutObjectRequest request = captor.getValue();
            assertThat(request.bucket()).isEqualTo("test-bucket");
            assertThat(request.key()).startsWith("exams/");
            assertThat(request.key()).endsWith("_exam.pdf");
            assertThat(request.contentType()).isEqualTo("application/pdf");
            assertThat(request.serverSideEncryption()).isEqualTo(ServerSideEncryption.AES256);
            assertThat(key).isEqualTo(request.key());
        }

        @Test
        @DisplayName("Should throw StorageException on S3 failure")
        void uploadFailure() {
            when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                    .thenThrow(S3Exception.builder().message("Access Denied").build());

            assertThatThrownBy(() -> service.upload(StorageType.EXAM_PDF, "exam.pdf", new byte[0], "application/pdf"))
                    .isInstanceOf(StorageException.class)
                    .hasMessageContaining("exam.pdf");
        }

        @Test
        @DisplayName("Should use path prefix when configured")
        void uploadWithPathPrefix() {
            properties.getS3().setPathPrefix("tenant1/");
            when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                    .thenReturn(PutObjectResponse.builder().build());

            String key = service.upload(StorageType.SUBMISSION_IMAGE, "photo.jpg", new byte[1], "image/jpeg");

            assertThat(key).startsWith("tenant1/submissions/");
        }
    }

    @Nested
    @DisplayName("Download")
    class DownloadTests {

        @SuppressWarnings("unchecked")
        @Test
        @DisplayName("Should download file and return bytes")
        void downloadSuccessfully() {
            byte[] expected = "file data".getBytes();
            ResponseBytes<GetObjectResponse> responseBytes = mock(ResponseBytes.class);
            when(responseBytes.asByteArray()).thenReturn(expected);
            when(s3Client.getObjectAsBytes(any(GetObjectRequest.class))).thenReturn(responseBytes);

            byte[] result = service.download("exams/test-key");

            assertThat(result).isEqualTo(expected);

            ArgumentCaptor<GetObjectRequest> captor = ArgumentCaptor.forClass(GetObjectRequest.class);
            verify(s3Client).getObjectAsBytes(captor.capture());
            assertThat(captor.getValue().bucket()).isEqualTo("test-bucket");
            assertThat(captor.getValue().key()).isEqualTo("exams/test-key");
        }

        @Test
        @DisplayName("Should throw StorageException when file not found")
        void downloadNotFound() {
            when(s3Client.getObjectAsBytes(any(GetObjectRequest.class)))
                    .thenThrow(NoSuchKeyException.builder().message("Not found").build());

            assertThatThrownBy(() -> service.download("missing-key"))
                    .isInstanceOf(StorageException.class)
                    .hasMessageContaining("missing-key");
        }
    }

    @Nested
    @DisplayName("Delete")
    class DeleteTests {

        @Test
        @DisplayName("Should delete file from S3")
        void deleteSuccessfully() {
            service.delete("exams/test-key");

            ArgumentCaptor<DeleteObjectRequest> captor = ArgumentCaptor.forClass(DeleteObjectRequest.class);
            verify(s3Client).deleteObject(captor.capture());
            assertThat(captor.getValue().bucket()).isEqualTo("test-bucket");
            assertThat(captor.getValue().key()).isEqualTo("exams/test-key");
        }

        @Test
        @DisplayName("Should throw StorageException on delete failure")
        void deleteFailure() {
            when(s3Client.deleteObject(any(DeleteObjectRequest.class)))
                    .thenThrow(S3Exception.builder().message("Error").build());

            assertThatThrownBy(() -> service.delete("exams/test-key"))
                    .isInstanceOf(StorageException.class);
        }
    }

    @Nested
    @DisplayName("Presigned URLs")
    class PresignedUrlTests {

        @Test
        @DisplayName("Should generate presigned upload URL")
        void presignedUploadUrl() throws Exception {
            PresignedPutObjectRequest presigned = mock(PresignedPutObjectRequest.class);
            when(presigned.url()).thenReturn(URI.create("https://test-bucket.s3.amazonaws.com/exams/key?signature=abc").toURL());
            when(s3Presigner.presignPutObject(any(PutObjectPresignRequest.class))).thenReturn(presigned);

            String url = service.generatePresignedUploadUrl(StorageType.EXAM_PDF, "exam.pdf", "application/pdf");

            assertThat(url).startsWith("https://");
            verify(s3Presigner).presignPutObject(any(PutObjectPresignRequest.class));
        }

        @Test
        @DisplayName("Should generate presigned download URL")
        void presignedDownloadUrl() throws Exception {
            PresignedGetObjectRequest presigned = mock(PresignedGetObjectRequest.class);
            when(presigned.url()).thenReturn(URI.create("https://test-bucket.s3.amazonaws.com/exams/key?signature=abc").toURL());
            when(s3Presigner.presignGetObject(any(GetObjectPresignRequest.class))).thenReturn(presigned);

            String url = service.generatePresignedDownloadUrl("exams/test-key");

            assertThat(url).startsWith("https://");
            verify(s3Presigner).presignGetObject(any(GetObjectPresignRequest.class));
        }
    }

    @Nested
    @DisplayName("Exists")
    class ExistsTests {

        @Test
        @DisplayName("Should return true when file exists")
        void existsTrue() {
            when(s3Client.headObject(any(HeadObjectRequest.class)))
                    .thenReturn(HeadObjectResponse.builder().build());

            assertThat(service.exists("exams/test-key")).isTrue();
        }

        @Test
        @DisplayName("Should return false when file does not exist")
        void existsFalse() {
            when(s3Client.headObject(any(HeadObjectRequest.class)))
                    .thenThrow(NoSuchKeyException.builder().message("Not found").build());

            assertThat(service.exists("exams/missing-key")).isFalse();
        }

        @Test
        @DisplayName("Should throw StorageException on unexpected S3 error")
        void existsError() {
            when(s3Client.headObject(any(HeadObjectRequest.class)))
                    .thenThrow(S3Exception.builder().message("Internal Error").build());

            assertThatThrownBy(() -> service.exists("exams/test-key"))
                    .isInstanceOf(StorageException.class);
        }
    }

    @Nested
    @DisplayName("Public URL")
    class PublicUrlTests {

        @Test
        @DisplayName("Should return standard S3 URL")
        void standardUrl() {
            String url = service.getPublicUrl("exams/test-key");
            assertThat(url).isEqualTo("https://test-bucket.s3.us-east-1.amazonaws.com/exams/test-key");
        }

        @Test
        @DisplayName("Should return custom endpoint URL when configured")
        void customEndpointUrl() {
            properties.getS3().setEndpoint("http://localhost:4566");

            String url = service.getPublicUrl("exams/test-key");
            assertThat(url).isEqualTo("http://localhost:4566/test-bucket/exams/test-key");
        }
    }

    @Nested
    @DisplayName("Key Generation")
    class KeyGenerationTests {

        @Test
        @DisplayName("Should generate key with correct prefix and sanitized filename")
        void keyFormat() {
            String key = service.generateKey(StorageType.EXAM_PDF, "my exam (1).pdf");

            assertThat(key).startsWith("exams/");
            assertThat(key).endsWith("_my_exam__1_.pdf");
            assertThat(key).doesNotContain(" ");
            assertThat(key).doesNotContain("(");
        }

        @Test
        @DisplayName("Should include path prefix in key")
        void keyWithPathPrefix() {
            properties.getS3().setPathPrefix("school1/");
            String key = service.generateKey(StorageType.SUBMISSION_IMAGE, "photo.jpg");

            assertThat(key).startsWith("school1/submissions/");
        }

        @Test
        @DisplayName("Should generate unique keys for same filename")
        void uniqueKeys() {
            String key1 = service.generateKey(StorageType.EXAM_PDF, "exam.pdf");
            String key2 = service.generateKey(StorageType.EXAM_PDF, "exam.pdf");

            assertThat(key1).isNotEqualTo(key2);
        }
    }
}
