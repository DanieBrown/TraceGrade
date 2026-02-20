package com.tracegrade.grading;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.dto.response.GradingResultResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class GradingController {

    private final GradingService gradingService;

    @PostMapping("/api/submissions/{submissionId}/grade")
    public ResponseEntity<ApiResponse<GradingResultResponse>> grade(
            @PathVariable UUID submissionId) {

        GradingResultResponse response = gradingService.grade(submissionId);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping("/api/submissions/{submissionId}/grade")
    public ResponseEntity<ApiResponse<GradingResultResponse>> getResult(
            @PathVariable UUID submissionId) {

        GradingResultResponse response = gradingService.getResult(submissionId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/api/grading/reviews/pending")
    public ResponseEntity<ApiResponse<List<GradingResultResponse>>> getPendingReviews() {
        List<GradingResultResponse> response = gradingService.getPendingReviews();
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
