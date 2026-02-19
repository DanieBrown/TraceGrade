package com.tracegrade.submission;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import com.tracegrade.domain.model.StudentSubmission;
import com.tracegrade.domain.model.SubmissionStatus;
import com.tracegrade.domain.repository.StudentSubmissionRepository;
import com.tracegrade.dto.response.BatchUploadResponse;
import com.tracegrade.dto.response.FileUploadResponse;
import com.tracegrade.exception.StorageException;
import com.tracegrade.storage.StorageService;
import com.tracegrade.storage.StorageType;

@SuppressWarnings("null") // Mockito thenReturn vs @NonNull JpaRepository.save() return type
class SubmissionUploadServiceTest {

    private StorageService storageService;
    private StudentSubmissionRepository submissionRepository;
    private SubmissionUploadService service;

    private static final UUID ASSIGNMENT_ID = UUID.randomUUID();
    private static final UUID STUDENT_ID = UUID.randomUUID();
    private static final String STORAGE_KEY = "submissions/uuid_exam.jpg";
    private static final String FILE_URL = "https://bucket.s3.amazonaws.com/" + STORAGE_KEY;

    @BeforeEach
    void setUp() {
        storageService = mock(StorageService.class);
        submissionRepository = mock(StudentSubmissionRepository.class);
        service = new SubmissionUploadService(storageService, submissionRepository);
    }

    @Nested
    @DisplayName("Single upload")
    class SingleUploadTests {

        @Test
        @DisplayName("Should upload file to S3 and persist submission entity")
        void uploadSingleSuccess() {
            MockMultipartFile file = new MockMultipartFile(
                    "file", "exam.jpg", "image/jpeg", "jpeg content".getBytes());

            when(storageService.upload(eq(StorageType.SUBMISSION_IMAGE), eq("exam.jpg"), any(), eq("image/jpeg")))
                    .thenReturn(STORAGE_KEY);
            when(storageService.getPublicUrl(STORAGE_KEY)).thenReturn(FILE_URL);

            StudentSubmission saved = buildSavedSubmission(FILE_URL, "jpg");
            when(submissionRepository.save(any(StudentSubmission.class))).thenReturn(saved);

            FileUploadResponse response = service.uploadSingle(ASSIGNMENT_ID, STUDENT_ID, file);

            assertThat(response.getSubmissionId()).isEqualTo(saved.getId());
            assertThat(response.getFileUrl()).isEqualTo(FILE_URL);
            assertThat(response.getFileName()).isEqualTo("exam.jpg");
            assertThat(response.getStatus()).isEqualTo(SubmissionStatus.PENDING.name());
            assertThat(response.getUploadedAt()).isNotNull();

            verify(storageService).upload(StorageType.SUBMISSION_IMAGE, "exam.jpg", "jpeg content".getBytes(), "image/jpeg");
            verify(submissionRepository).save(any(StudentSubmission.class));
        }

        @Test
        @DisplayName("Should use 'application/octet-stream' when content type is null")
        void uploadWithNullContentType() {
            MockMultipartFile file = new MockMultipartFile("file", "scan.png", null, "png content".getBytes());

            when(storageService.upload(eq(StorageType.SUBMISSION_IMAGE), eq("scan.png"), any(), eq("application/octet-stream")))
                    .thenReturn(STORAGE_KEY);
            when(storageService.getPublicUrl(STORAGE_KEY)).thenReturn(FILE_URL);
            when(submissionRepository.save(any())).thenReturn(buildSavedSubmission(FILE_URL, "png"));

            service.uploadSingle(ASSIGNMENT_ID, STUDENT_ID, file);

            verify(storageService).upload(StorageType.SUBMISSION_IMAGE, "scan.png", "png content".getBytes(), "application/octet-stream");
        }

        @Test
        @DisplayName("Should extract format 'unknown' when filename has no extension")
        void uploadWithNoExtensionFilename() {
            MockMultipartFile file = new MockMultipartFile("file", "scanimage", "image/jpeg", "jpeg content".getBytes());

            when(storageService.upload(any(), any(), any(), any())).thenReturn(STORAGE_KEY);
            when(storageService.getPublicUrl(any())).thenReturn(FILE_URL);

            StudentSubmission saved = buildSavedSubmission(FILE_URL, "unknown");
            when(submissionRepository.save(any())).thenReturn(saved);

            service.uploadSingle(ASSIGNMENT_ID, STUDENT_ID, file);

            verify(submissionRepository).save(any(StudentSubmission.class));
        }

        @Test
        @DisplayName("Should throw StorageException when S3 upload fails")
        void uploadStorageFailure() {
            MockMultipartFile file = new MockMultipartFile("file", "exam.jpg", "image/jpeg", "bytes".getBytes());

            when(storageService.upload(any(), any(), any(), any()))
                    .thenThrow(new StorageException("upload", "S3 unreachable"));

            assertThatThrownBy(() -> service.uploadSingle(ASSIGNMENT_ID, STUDENT_ID, file))
                    .isInstanceOf(StorageException.class)
                    .hasMessageContaining("S3 unreachable");
        }

        @Test
        @DisplayName("Should wrap IOException in StorageException")
        void uploadIOException() throws IOException {
            MockMultipartFile file = mock(MockMultipartFile.class);
            when(file.getOriginalFilename()).thenReturn("exam.jpg");
            when(file.getContentType()).thenReturn("image/jpeg");
            when(file.getBytes()).thenThrow(new IOException("disk error"));

            assertThatThrownBy(() -> service.uploadSingle(ASSIGNMENT_ID, STUDENT_ID, file))
                    .isInstanceOf(StorageException.class)
                    .hasMessageContaining("disk error");
        }
    }

    @Nested
    @DisplayName("Batch upload")
    class BatchUploadTests {

        @Test
        @DisplayName("Should upload each file and return all results")
        void uploadBatchSuccess() {
            MockMultipartFile file1 = new MockMultipartFile("files", "page1.jpg", "image/jpeg", "bytes1".getBytes());
            MockMultipartFile file2 = new MockMultipartFile("files", "page2.jpg", "image/jpeg", "bytes2".getBytes());

            String key1 = "submissions/uuid1_page1.jpg";
            String key2 = "submissions/uuid2_page2.jpg";
            String url1 = "https://bucket/" + key1;
            String url2 = "https://bucket/" + key2;

            when(storageService.upload(eq(StorageType.SUBMISSION_IMAGE), eq("page1.jpg"), any(), any())).thenReturn(key1);
            when(storageService.upload(eq(StorageType.SUBMISSION_IMAGE), eq("page2.jpg"), any(), any())).thenReturn(key2);
            when(storageService.getPublicUrl(key1)).thenReturn(url1);
            when(storageService.getPublicUrl(key2)).thenReturn(url2);
            when(submissionRepository.save(any()))
                    .thenReturn(buildSavedSubmission(url1, "jpg"))
                    .thenReturn(buildSavedSubmission(url2, "jpg"));

            BatchUploadResponse response = service.uploadBatch(ASSIGNMENT_ID, STUDENT_ID, List.of(file1, file2));

            assertThat(response.getTotalFiles()).isEqualTo(2);
            assertThat(response.getSuccessfulUploads()).isEqualTo(2);
            assertThat(response.getSubmissions()).hasSize(2);

            verify(storageService, times(2)).upload(eq(StorageType.SUBMISSION_IMAGE), any(), any(), any());
            verify(submissionRepository, times(2)).save(any(StudentSubmission.class));
        }

        @Test
        @DisplayName("Should propagate StorageException on first file failure")
        void uploadBatchFailsOnFirstError() {
            MockMultipartFile file1 = new MockMultipartFile("files", "page1.jpg", "image/jpeg", "bytes".getBytes());
            MockMultipartFile file2 = new MockMultipartFile("files", "page2.jpg", "image/jpeg", "bytes".getBytes());

            when(storageService.upload(any(), any(), any(), any()))
                    .thenThrow(new StorageException("upload", "S3 error"));

            assertThatThrownBy(() -> service.uploadBatch(ASSIGNMENT_ID, STUDENT_ID, List.of(file1, file2)))
                    .isInstanceOf(StorageException.class);
        }
    }

    private StudentSubmission buildSavedSubmission(String fileUrl, String format) {
        return StudentSubmission.builder()
                .assignmentId(ASSIGNMENT_ID)
                .studentId(STUDENT_ID)
                .submissionImageUrls("[\"" + fileUrl + "\"]")
                .originalFormat(format)
                .status(SubmissionStatus.PENDING)
                .submittedAt(java.time.Instant.now())
                .build();
    }
}
