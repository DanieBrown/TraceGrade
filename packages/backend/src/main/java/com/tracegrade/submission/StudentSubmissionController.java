package com.tracegrade.submission;

import java.util.List;
import java.util.UUID;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.tracegrade.dto.request.UpdateSubmissionStatusRequest;
import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.dto.response.BatchUploadResponse;
import com.tracegrade.dto.response.FileUploadResponse;
import com.tracegrade.dto.response.SubmissionStatusResponse;
import com.tracegrade.validation.ValidFileUpload;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/submissions")
@RequiredArgsConstructor
@Validated
public class StudentSubmissionController {

    private final SubmissionUploadService uploadService;
    private final StudentSubmissionService submissionService;

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

    /**
     * Retrieve the current status and grading info for a submission.
     *
     * GET /api/submissions/{submissionId}
     *
     * @param submissionId the submission to look up
     */
    @GetMapping("/{submissionId}")
    public ResponseEntity<ApiResponse<SubmissionStatusResponse>> getSubmission(
            @PathVariable UUID submissionId) {

        SubmissionStatusResponse response = submissionService.getSubmission(submissionId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Update the processing status of a submission.
     *
     * PATCH /api/submissions/{submissionId}/status
     * Content-Type: application/json
     *
     * @param submissionId the submission to update
     * @param request      body containing the new status
     */
    @PatchMapping("/{submissionId}/status")
    public ResponseEntity<ApiResponse<SubmissionStatusResponse>> updateStatus(
            @PathVariable UUID submissionId,
            @Valid @RequestBody UpdateSubmissionStatusRequest request) {

        SubmissionStatusResponse response = submissionService.updateStatus(submissionId, request.getStatus());
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
