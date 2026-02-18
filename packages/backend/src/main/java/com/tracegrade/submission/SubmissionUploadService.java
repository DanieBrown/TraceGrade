package com.tracegrade.submission;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.tracegrade.domain.model.StudentSubmission;
import com.tracegrade.domain.model.SubmissionStatus;
import com.tracegrade.domain.repository.StudentSubmissionRepository;
import com.tracegrade.dto.response.BatchUploadResponse;
import com.tracegrade.dto.response.FileUploadResponse;
import com.tracegrade.exception.StorageException;
import com.tracegrade.storage.StorageService;
import com.tracegrade.storage.StorageType;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubmissionUploadService {

    private final StorageService storageService;
    private final StudentSubmissionRepository submissionRepository;

    @Transactional
    public FileUploadResponse uploadSingle(UUID assignmentId, UUID studentId, MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        String format = extractFormat(originalFilename);
        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";

        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException e) {
            throw new StorageException("upload", "Failed to read uploaded file: " + e.getMessage(), e);
        }

        log.info("Uploading submission for assignmentId={} studentId={} fileName={}", assignmentId, studentId, originalFilename);

        String storageKey = storageService.upload(StorageType.SUBMISSION_IMAGE, originalFilename, content, contentType);
        String fileUrl = storageService.getPublicUrl(storageKey);

        Instant now = Instant.now();
        StudentSubmission submission = StudentSubmission.builder()
                .assignmentId(assignmentId)
                .studentId(studentId)
                .submissionImageUrls("[\"" + fileUrl + "\"]")
                .originalFormat(format)
                .status(SubmissionStatus.PENDING)
                .submittedAt(now)
                .build();

        StudentSubmission saved = submissionRepository.save(submission);
        log.info("Submission created id={}", saved.getId());

        return FileUploadResponse.builder()
                .submissionId(saved.getId())
                .fileUrl(fileUrl)
                .fileName(originalFilename)
                .status(saved.getStatus().name())
                .uploadedAt(saved.getSubmittedAt())
                .build();
    }

    @Transactional
    public BatchUploadResponse uploadBatch(UUID assignmentId, UUID studentId, List<MultipartFile> files) {
        List<FileUploadResponse> results = files.stream()
                .map(file -> uploadSingle(assignmentId, studentId, file))
                .toList();

        return BatchUploadResponse.builder()
                .submissions(results)
                .totalFiles(files.size())
                .successfulUploads(results.size())
                .build();
    }

    private String extractFormat(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "unknown";
        }
        String ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
        return ext.length() > 10 ? ext.substring(0, 10) : ext;
    }
}
