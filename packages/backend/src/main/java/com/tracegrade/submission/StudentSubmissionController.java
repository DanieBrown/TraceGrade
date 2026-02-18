package com.tracegrade.submission;

import java.util.List;
import java.util.UUID;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.dto.response.BatchUploadResponse;
import com.tracegrade.dto.response.FileUploadResponse;
import com.tracegrade.validation.ValidFileUpload;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/submissions")
@RequiredArgsConstructor
@Validated
public class StudentSubmissionController {

    private final SubmissionUploadService uploadService;

    /**
     * Upload a single exam submission image.
     *
     * POST /api/submissions/upload
     * Content-Type: multipart/form-data
     *
     * @param assignmentId the assignment this submission belongs to
     * @param studentId    the student making the submission
     * @param file         the exam image file (JPEG, PNG, PDF, or HEIC; max 10 MB)
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<FileUploadResponse>> uploadFile(
            @RequestParam @NotNull UUID assignmentId,
            @RequestParam @NotNull UUID studentId,
            @RequestPart("file") @ValidFileUpload MultipartFile file) {

        FileUploadResponse response = uploadService.uploadSingle(assignmentId, studentId, file);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Upload multiple exam submission images in a single request.
     *
     * POST /api/submissions/upload/batch
     * Content-Type: multipart/form-data
     *
     * @param assignmentId the assignment these submissions belong to
     * @param studentId    the student making the submissions
     * @param files        the exam image files (each: JPEG, PNG, PDF, or HEIC; max 10 MB)
     */
    @PostMapping(value = "/upload/batch", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<BatchUploadResponse>> uploadFiles(
            @RequestParam @NotNull UUID assignmentId,
            @RequestParam @NotNull UUID studentId,
            @RequestPart("files") @NotEmpty List<@ValidFileUpload MultipartFile> files) {

        BatchUploadResponse response = uploadService.uploadBatch(assignmentId, studentId, files);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
