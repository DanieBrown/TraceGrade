package com.tracegrade.submission;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Student Submissions", description = "Upload exam images and track submission processing status")
@SecurityRequirement(name = "BearerAuth")
public class StudentSubmissionController {

    private final SubmissionUploadService uploadService;
    private final StudentSubmissionService submissionService;

    @Operation(
            summary = "Upload a single exam submission image",
            description = "Accepts a multipart file (JPEG, PNG, PDF, or HEIC; max 10 MB) and stores it for "
                    + "the specified assignment and student."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "File uploaded successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid file type, size exceeded, or missing parameters", content = @Content)
    })
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<FileUploadResponse>> uploadFile(
            @Parameter(description = "UUID of the assignment this submission belongs to", required = true)
            @RequestParam @NotNull UUID assignmentId,
            @Parameter(description = "UUID of the student making the submission", required = true)
            @RequestParam @NotNull UUID studentId,
            @Parameter(description = "Exam image file (JPEG, PNG, PDF, or HEIC; max 10 MB)", required = true)
            @RequestPart("file") @ValidFileUpload MultipartFile file) {

        FileUploadResponse response = uploadService.uploadSingle(assignmentId, studentId, file);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(
            summary = "Upload multiple exam submission images",
            description = "Accepts multiple multipart files in a single request. Each file must be JPEG, PNG, PDF, "
                    + "or HEIC and no larger than 10 MB."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Files uploaded, per-file results returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "One or more files failed validation", content = @Content)
    })
    @PostMapping(value = "/upload/batch", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<BatchUploadResponse>> uploadFiles(
            @Parameter(description = "UUID of the assignment these submissions belong to", required = true)
            @RequestParam @NotNull UUID assignmentId,
            @Parameter(description = "UUID of the student making the submissions", required = true)
            @RequestParam @NotNull UUID studentId,
            @Parameter(description = "Exam image files (each: JPEG, PNG, PDF, or HEIC; max 10 MB)", required = true)
            @RequestPart("files") @NotEmpty List<@ValidFileUpload MultipartFile> files) {

        BatchUploadResponse response = uploadService.uploadBatch(assignmentId, studentId, files);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(
            summary = "Get submission status and grading info",
            description = "Returns the current processing status of a submission and, once graded, a summary "
                    + "of the grading result."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Submission status returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Submission not found", content = @Content)
    })
    @GetMapping("/{submissionId}")
    public ResponseEntity<ApiResponse<SubmissionStatusResponse>> getSubmission(
            @Parameter(description = "UUID of the submission", required = true)
            @PathVariable UUID submissionId) {

        SubmissionStatusResponse response = submissionService.getSubmission(submissionId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(
            summary = "Update submission processing status",
            description = "Transitions the submission to a new status (PENDING, PROCESSING, COMPLETED, or FAILED). "
                    + "Typically used by internal workers rather than end users."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Status updated, updated submission returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid status value", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Submission not found", content = @Content)
    })
    @PatchMapping("/{submissionId}/status")
    public ResponseEntity<ApiResponse<SubmissionStatusResponse>> updateStatus(
            @Parameter(description = "UUID of the submission to update", required = true)
            @PathVariable UUID submissionId,
            @Valid @RequestBody UpdateSubmissionStatusRequest request) {

        SubmissionStatusResponse response = submissionService.updateStatus(submissionId, request.getStatus());
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
