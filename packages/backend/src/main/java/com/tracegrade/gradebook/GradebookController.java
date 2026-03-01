package com.tracegrade.gradebook;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.dto.response.GradebookResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/schools/{schoolId}/classes/{classId}/gradebook")
@RequiredArgsConstructor
@Validated
@Tag(name = "Gradebook", description = "Composite gradebook view for a class. Returns all assignments, enrolled students, and their grades in a single payload.")
@SecurityRequirement(name = "BearerAuth")
public class GradebookController {

    private final GradebookService gradebookService;

    @Operation(
            summary = "Get the full gradebook for a class",
            description = "Returns a composite payload containing all published assignments as columns, all actively enrolled students as rows, and each student's grades as cells. Student averages are weighted by grade category. Empty rows/columns arrays are returned when the class has no enrollments or no assignments."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Gradebook returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School or class not found", content = @Content)
    })
    @GetMapping
    public ResponseEntity<ApiResponse<GradebookResponse>> getGradebook(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId) {

        GradebookResponse gradebook = gradebookService.getGradebook(schoolId, classId);
        return ResponseEntity.ok(ApiResponse.success(gradebook));
    }
}
