package com.tracegrade.rubric;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tracegrade.dto.request.CreateAnswerRubricRequest;
import com.tracegrade.dto.request.UpdateAnswerRubricRequest;
import com.tracegrade.dto.response.AnswerRubricResponse;
import com.tracegrade.dto.response.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/exam-templates/{examTemplateId}/rubrics")
@RequiredArgsConstructor
@Validated
public class AnswerRubricController {

    private final AnswerRubricService rubricService;

    @PostMapping
    public ResponseEntity<ApiResponse<AnswerRubricResponse>> create(
            @PathVariable UUID examTemplateId,
            @Valid @RequestBody CreateAnswerRubricRequest request) {

        AnswerRubricResponse response = rubricService.create(examTemplateId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<AnswerRubricResponse>>> listAll(
            @PathVariable UUID examTemplateId) {

        List<AnswerRubricResponse> response = rubricService.listByExamTemplate(examTemplateId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{rubricId}")
    public ResponseEntity<ApiResponse<AnswerRubricResponse>> getById(
            @PathVariable UUID examTemplateId,
            @PathVariable UUID rubricId) {

        AnswerRubricResponse response = rubricService.getById(examTemplateId, rubricId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{rubricId}")
    public ResponseEntity<ApiResponse<AnswerRubricResponse>> update(
            @PathVariable UUID examTemplateId,
            @PathVariable UUID rubricId,
            @Valid @RequestBody UpdateAnswerRubricRequest request) {

        AnswerRubricResponse response = rubricService.update(examTemplateId, rubricId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @DeleteMapping("/{rubricId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID examTemplateId,
            @PathVariable UUID rubricId) {

        rubricService.delete(examTemplateId, rubricId);
        return ResponseEntity.noContent().build();
    }
}
