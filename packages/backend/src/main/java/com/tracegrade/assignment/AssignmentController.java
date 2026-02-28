package com.tracegrade.assignment;

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

import com.tracegrade.dto.request.CreateAssignmentRequest;
import com.tracegrade.dto.request.UpdateAssignmentRequest;
import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.dto.response.AssignmentResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/schools/{schoolId}/classes/{classId}/assignments")
@RequiredArgsConstructor
@Validated
@Tag(name = "Assignments", description = "Assignment management scoped to a class within a school. All operations require valid schoolId and classId path parameters.")
@SecurityRequirement(name = "BearerAuth")
public class AssignmentController {

    private final AssignmentService assignmentService;

    @Operation(
            summary = "List assignments for a class",
            description = "Returns all assignments for the specified class."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Assignment list returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Class not found", content = @Content)
    })
    @GetMapping
    public ResponseEntity<ApiResponse<List<AssignmentResponse>>> listAssignments(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId) {

        List<AssignmentResponse> assignments = assignmentService.listAssignments(schoolId, classId);
        return ResponseEntity.ok(ApiResponse.success(assignments));
    }

    @Operation(
            summary = "Get a single assignment",
            description = "Returns the assignment with the specified ID scoped to the given class."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Assignment returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Class or assignment not found", content = @Content)
    })
    @GetMapping("/{assignmentId}")
    public ResponseEntity<ApiResponse<AssignmentResponse>> getAssignment(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId,
            @Parameter(description = "UUID of the assignment", required = true)
            @PathVariable UUID assignmentId) {

        AssignmentResponse assignment = assignmentService.getAssignment(schoolId, classId, assignmentId);
        return ResponseEntity.ok(ApiResponse.success(assignment));
    }

    @Operation(
            summary = "Create an assignment for a class",
            description = "Creates a new assignment in the specified class. Returns 400 if categoryId does not belong to the class or if validation fails."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Assignment created"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error or category not in class", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Class not found", content = @Content)
    })
    @PostMapping
    public ResponseEntity<ApiResponse<AssignmentResponse>> createAssignment(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId,
            @Valid @RequestBody CreateAssignmentRequest request) {

        AssignmentResponse created = assignmentService.createAssignment(schoolId, classId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @Operation(
            summary = "Update an assignment",
            description = "Updates an existing assignment. All fields are optional. Returns 400 if categoryId does not belong to the class."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Assignment updated"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error or category not in class", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Class or assignment not found", content = @Content)
    })
    @PutMapping("/{assignmentId}")
    public ResponseEntity<ApiResponse<AssignmentResponse>> updateAssignment(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId,
            @Parameter(description = "UUID of the assignment to update", required = true)
            @PathVariable UUID assignmentId,
            @Valid @RequestBody UpdateAssignmentRequest request) {

        AssignmentResponse updated = assignmentService.updateAssignment(schoolId, classId, assignmentId, request);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    @Operation(
            summary = "Delete an assignment",
            description = "Hard-deletes the assignment. Associated grades are cascade-deleted by the database. Returns 404 if the assignment does not exist in the specified class."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204", description = "Assignment deleted"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Class or assignment not found", content = @Content)
    })
    @DeleteMapping("/{assignmentId}")
    public ResponseEntity<Void> deleteAssignment(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId,
            @Parameter(description = "UUID of the assignment to delete", required = true)
            @PathVariable UUID assignmentId) {

        assignmentService.deleteAssignment(schoolId, classId, assignmentId);
        return ResponseEntity.noContent().build();
    }
}
