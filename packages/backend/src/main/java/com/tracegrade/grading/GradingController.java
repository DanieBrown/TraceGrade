package com.tracegrade.grading;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.tracegrade.dto.request.GradingReviewRequest;
import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.dto.response.GradingEnqueuedResponse;
import com.tracegrade.dto.response.GradingResultResponse;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@Tag(name = "Grading", description = "AI grading lifecycle: enqueue jobs, retrieve results, and manage teacher reviews")
@SecurityRequirement(name = "BearerAuth")
public class GradingController {

    private final GradingService gradingService;

    @Operation(
            summary = "Enqueue a submission for AI grading",
            description = "Publishes a grading job for the given submission. If SQS is configured the job is "
                    + "processed asynchronously; otherwise it is graded synchronously before this call returns."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "202", description = "Grading job accepted"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Submission not found", content = @Content)
    })
    @PostMapping("/api/submissions/{submissionId}/grade")
    public ResponseEntity<ApiResponse<GradingEnqueuedResponse>> enqueueGrading(
            @Parameter(description = "UUID of the submission to grade", required = true)
            @PathVariable UUID submissionId) {

        GradingEnqueuedResponse response = gradingService.enqueueGrading(submissionId);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(ApiResponse.success(response));
    }

    @Operation(
            summary = "Get grading result for a submission",
            description = "Returns the current grading result for the given submission, including AI score, "
                    + "confidence, and whether the result requires teacher review."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Grading result returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Submission or result not found", content = @Content)
    })
    @GetMapping("/api/submissions/{submissionId}/grade")
    public ResponseEntity<ApiResponse<GradingResultResponse>> getResult(
            @Parameter(description = "UUID of the submission", required = true)
            @PathVariable UUID submissionId) {

        GradingResultResponse response = gradingService.getResult(submissionId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(
            summary = "List grading results pending teacher review",
            description = "Returns all grading results where the AI confidence fell below the configured threshold "
                    + "and a teacher review is required."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "List of pending reviews returned")
    })
    @GetMapping("/api/grading/reviews/pending")
    public ResponseEntity<ApiResponse<List<GradingResultResponse>>> getPendingReviews() {
        List<GradingResultResponse> response = gradingService.getPendingReviews();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(
            summary = "Submit a teacher review for a grading result",
            description = "Allows a teacher to confirm or override the AI-assigned score and optionally update "
                    + "per-question scores."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Review applied, updated result returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid review payload", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Grading result not found", content = @Content)
    })
    @PatchMapping("/api/grading/{gradeId}/review")
    public ResponseEntity<ApiResponse<GradingResultResponse>> reviewGrade(
            @Parameter(description = "UUID of the grading result to review", required = true)
            @PathVariable UUID gradeId,
            @RequestBody @Valid GradingReviewRequest request) {

        GradingResultResponse response = gradingService.reviewGrade(gradeId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
