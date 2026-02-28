package com.tracegrade.enrollment;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tracegrade.dto.request.EnrollStudentRequest;
import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.dto.response.EnrollmentResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/schools/{schoolId}/classes/{classId}/enrollments")
@RequiredArgsConstructor
@Validated
@Tag(name = "Enrollments", description = "Enrollment management scoped to a class within a school. All operations require valid schoolId and classId path parameters.")
@SecurityRequirement(name = "BearerAuth")
public class ClassEnrollmentController {

    private final ClassEnrollmentService enrollmentService;

    @Operation(
            summary = "Enroll a student in a class",
            description = "Creates an enrollment record for the given student in the specified class. Returns 409 if the student is already actively enrolled."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Enrollment created"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Class or student not found", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Student already actively enrolled", content = @Content)
    })
    @PostMapping
    public ResponseEntity<ApiResponse<EnrollmentResponse>> enrollStudent(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId,
            @Valid @RequestBody EnrollStudentRequest request) {

        EnrollmentResponse created = enrollmentService.enrollStudent(schoolId, classId, request.getStudentId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @Operation(
            summary = "List active enrollments for a class",
            description = "Returns all active (not dropped) enrollments for the specified class."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Enrollment list returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Class not found", content = @Content)
    })
    @GetMapping
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> listEnrollments(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId) {

        List<EnrollmentResponse> enrollments = enrollmentService.listEnrollments(schoolId, classId);
        return ResponseEntity.ok(ApiResponse.success(enrollments));
    }

    @Operation(
            summary = "Drop a student from a class",
            description = "Soft-deletes the enrollment by setting droppedAt to the current timestamp. Returns 404 if the enrollment does not exist or is already dropped."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204", description = "Student dropped"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Enrollment or class not found", content = @Content)
    })
    @DeleteMapping("/{enrollmentId}")
    public ResponseEntity<Void> dropStudent(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId,
            @Parameter(description = "UUID of the enrollment to drop", required = true)
            @PathVariable UUID enrollmentId) {

        enrollmentService.dropStudent(schoolId, classId, enrollmentId);
        return ResponseEntity.noContent().build();
    }
}
