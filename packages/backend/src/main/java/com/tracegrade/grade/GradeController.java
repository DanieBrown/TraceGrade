package com.tracegrade.grade;

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

import com.tracegrade.dto.request.BulkCreateGradesRequest;
import com.tracegrade.dto.request.CreateGradeRequest;
import com.tracegrade.dto.request.UpdateGradeRequest;
import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.dto.response.GradeResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/schools/{schoolId}/classes/{classId}/assignments/{assignmentId}/grades")
@RequiredArgsConstructor
@Validated
@Tag(name = "Grades", description = "Grade management scoped to an assignment within a class within a school. All operations require valid schoolId, classId, and assignmentId path parameters.")
@SecurityRequirement(name = "BearerAuth")
public class GradeController {

    private final GradeService gradeService;

    @Operation(
            summary = "List grades for an assignment",
            description = "Returns all grades for the specified assignment."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Grade list returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School, class, or assignment not found", content = @Content)
    })
    @GetMapping
    public ResponseEntity<ApiResponse<List<GradeResponse>>> listGrades(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId,
            @Parameter(description = "UUID of the assignment", required = true)
            @PathVariable UUID assignmentId) {

        List<GradeResponse> grades = gradeService.listGradesByAssignment(schoolId, classId, assignmentId);
        return ResponseEntity.ok(ApiResponse.success(grades));
    }

    @Operation(
            summary = "Create a grade for a student",
            description = "Creates a new grade for the specified student and assignment. Returns 409 if a grade already exists for this (student, assignment) pair."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Grade created"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School, class, or assignment not found", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Grade already exists for this student and assignment", content = @Content)
    })
    @PostMapping
    public ResponseEntity<ApiResponse<GradeResponse>> createGrade(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId,
            @Parameter(description = "UUID of the assignment", required = true)
            @PathVariable UUID assignmentId,
            @Valid @RequestBody CreateGradeRequest request) {

        GradeResponse created = gradeService.createGrade(schoolId, classId, assignmentId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @Operation(
            summary = "Bulk-create grades for multiple students",
            description = "Atomically creates grades for up to 50 students in a single request. The entire request is rolled back if any (student, assignment) pair already exists."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "All grades created"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error or empty grades list", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School, class, or assignment not found", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Duplicate (student, assignment) pair found; entire batch rejected", content = @Content)
    })
    @PostMapping("/bulk")
    public ResponseEntity<ApiResponse<List<GradeResponse>>> bulkCreateGrades(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId,
            @Parameter(description = "UUID of the assignment", required = true)
            @PathVariable UUID assignmentId,
            @Valid @RequestBody BulkCreateGradesRequest request) {

        List<GradeResponse> created = gradeService.bulkCreateGrades(schoolId, classId, assignmentId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @Operation(
            summary = "Get a single grade",
            description = "Returns a single grade by its ID, scoped to the specified assignment."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Grade returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School, class, assignment, or grade not found", content = @Content)
    })
    @GetMapping("/{gradeId}")
    public ResponseEntity<ApiResponse<GradeResponse>> getGrade(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId,
            @Parameter(description = "UUID of the assignment", required = true)
            @PathVariable UUID assignmentId,
            @Parameter(description = "UUID of the grade", required = true)
            @PathVariable UUID gradeId) {

        GradeResponse grade = gradeService.getGrade(schoolId, classId, assignmentId, gradeId);
        return ResponseEntity.ok(ApiResponse.success(grade));
    }

    @Operation(
            summary = "Update a grade",
            description = "Partially updates an existing grade. Setting status to EXCUSED will automatically set pointsEarned to null."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Grade updated"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School, class, assignment, or grade not found", content = @Content)
    })
    @PutMapping("/{gradeId}")
    public ResponseEntity<ApiResponse<GradeResponse>> updateGrade(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId,
            @Parameter(description = "UUID of the assignment", required = true)
            @PathVariable UUID assignmentId,
            @Parameter(description = "UUID of the grade to update", required = true)
            @PathVariable UUID gradeId,
            @Valid @RequestBody UpdateGradeRequest request) {

        GradeResponse updated = gradeService.updateGrade(schoolId, classId, assignmentId, gradeId, request);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    @Operation(
            summary = "Delete a grade",
            description = "Hard-deletes the grade. Returns 404 if the grade does not exist or does not belong to the specified assignment."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204", description = "Grade deleted"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School, class, assignment, or grade not found", content = @Content)
    })
    @DeleteMapping("/{gradeId}")
    public ResponseEntity<Void> deleteGrade(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId,
            @Parameter(description = "UUID of the assignment", required = true)
            @PathVariable UUID assignmentId,
            @Parameter(description = "UUID of the grade to delete", required = true)
            @PathVariable UUID gradeId) {

        gradeService.deleteGrade(schoolId, classId, assignmentId, gradeId);
        return ResponseEntity.noContent().build();
    }
}
