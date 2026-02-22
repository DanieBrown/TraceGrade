package com.tracegrade.rubric;

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
@Tag(name = "Answer Rubrics", description = "Manage answer rubrics for exam templates. Each rubric defines the expected answer and scoring for one question.")
@SecurityRequirement(name = "BearerAuth")
public class AnswerRubricController {

    private final AnswerRubricService rubricService;

    @Operation(
            summary = "Create a rubric for a question",
            description = "Adds a new answer rubric entry to the specified exam template. "
                    + "The question number must be unique within the template."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Rubric created"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid request or duplicate question number", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Exam template not found", content = @Content)
    })
    @PostMapping
    public ResponseEntity<ApiResponse<AnswerRubricResponse>> create(
            @Parameter(description = "UUID of the exam template", required = true)
            @PathVariable UUID examTemplateId,
            @Valid @RequestBody CreateAnswerRubricRequest request) {

        AnswerRubricResponse response = rubricService.create(examTemplateId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @Operation(
            summary = "List all rubrics for an exam template",
            description = "Returns every answer rubric belonging to the given exam template, ordered by question number."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Rubric list returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Exam template not found", content = @Content)
    })
    @GetMapping
    public ResponseEntity<ApiResponse<List<AnswerRubricResponse>>> listAll(
            @Parameter(description = "UUID of the exam template", required = true)
            @PathVariable UUID examTemplateId) {

        List<AnswerRubricResponse> response = rubricService.listByExamTemplate(examTemplateId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(
            summary = "Get a single rubric by ID",
            description = "Returns the rubric for a specific question within an exam template."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Rubric returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Exam template or rubric not found", content = @Content)
    })
    @GetMapping("/{rubricId}")
    public ResponseEntity<ApiResponse<AnswerRubricResponse>> getById(
            @Parameter(description = "UUID of the exam template", required = true)
            @PathVariable UUID examTemplateId,
            @Parameter(description = "UUID of the rubric", required = true)
            @PathVariable UUID rubricId) {

        AnswerRubricResponse response = rubricService.getById(examTemplateId, rubricId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(
            summary = "Update a rubric",
            description = "Replaces the rubric's fields with the values in the request body."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Rubric updated"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid request", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Exam template or rubric not found", content = @Content)
    })
    @PutMapping("/{rubricId}")
    public ResponseEntity<ApiResponse<AnswerRubricResponse>> update(
            @Parameter(description = "UUID of the exam template", required = true)
            @PathVariable UUID examTemplateId,
            @Parameter(description = "UUID of the rubric", required = true)
            @PathVariable UUID rubricId,
            @Valid @RequestBody UpdateAnswerRubricRequest request) {

        AnswerRubricResponse response = rubricService.update(examTemplateId, rubricId, request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(
            summary = "Delete a rubric",
            description = "Permanently removes the rubric from the exam template."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204", description = "Rubric deleted"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Exam template or rubric not found", content = @Content)
    })
    @DeleteMapping("/{rubricId}")
    public ResponseEntity<Void> delete(
            @Parameter(description = "UUID of the exam template", required = true)
            @PathVariable UUID examTemplateId,
            @Parameter(description = "UUID of the rubric", required = true)
            @PathVariable UUID rubricId) {

        rubricService.delete(examTemplateId, rubricId);
        return ResponseEntity.noContent().build();
    }
}
