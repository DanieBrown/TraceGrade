package com.tracegrade.submission;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.tracegrade.domain.model.ExamTemplate;
import com.tracegrade.domain.model.StudentSubmission;
import com.tracegrade.domain.model.SubmissionStatus;
import com.tracegrade.domain.repository.ExamTemplateRepository;
import com.tracegrade.domain.repository.StudentSubmissionRepository;
import com.tracegrade.dto.response.BatchUploadResponse;
import com.tracegrade.dto.response.FileUploadResponse;
import com.tracegrade.exception.ResourceNotFoundException;
import com.tracegrade.exception.StorageException;
import com.tracegrade.imageprocessing.ImagePreprocessingService;
import com.tracegrade.imageprocessing.PreprocessedImage;
import com.tracegrade.storage.StorageService;
import com.tracegrade.storage.StorageType;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubmissionUploadService {

    private final StorageService storageService;
    private final ExamTemplateRepository examTemplateRepository;
    private final StudentSubmissionRepository submissionRepository;
    private final ImagePreprocessingService preprocessingService;

    @Transactional
    public FileUploadResponse uploadSingle(UUID assignmentId, UUID studentId, MultipartFile file) {
        ExamTemplate examTemplate = resolveExamTemplate(assignmentId);
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

        List<PreprocessedImage> processed = preprocessingService.preprocess(originalFilename, content, contentType);

        List<String> fileUrls = new ArrayList<>(processed.size());
        for (PreprocessedImage img : processed) {
            String storageKey = storageService.upload(StorageType.SUBMISSION_IMAGE, img.filename(), img.content(), img.contentType());
            fileUrls.add(storageService.getPublicUrl(storageKey));
        }

        String submissionImageUrls = fileUrls.stream()
                .map(url -> "\"" + url + "\"")
                .collect(Collectors.joining(",", "[", "]"));

        Instant now = Instant.now();
        StudentSubmission submission = StudentSubmission.builder()
                .assignmentId(assignmentId)
                .studentId(studentId)
            .examTemplate(examTemplate)
                .submissionImageUrls(submissionImageUrls)
                .originalFormat(format)
                .status(SubmissionStatus.PENDING)
                .submittedAt(now)
                .build();

        StudentSubmission saved = submissionRepository.save(submission);
        log.info("Submission created id={}", saved.getId());

        return FileUploadResponse.builder()
                .submissionId(saved.getId())
                .fileUrl(fileUrls.get(0))
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

    private ExamTemplate resolveExamTemplate(UUID assignmentId) {
        return examTemplateRepository.findByAssignmentId(assignmentId)
                .or(() -> examTemplateRepository.findById(assignmentId))
                .orElseThrow(() -> new ResourceNotFoundException("ExamTemplate", assignmentId));
    }

    private String extractFormat(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "unknown";
        }
        String ext = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
        return ext.length() > 10 ? ext.substring(0, 10) : ext;
    }
}

