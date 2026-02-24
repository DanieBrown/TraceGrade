package com.tracegrade.student;

import com.tracegrade.dto.request.CreateStudentRequest;
import com.tracegrade.dto.request.UpdateStudentRequest;
import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.dto.response.StudentResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/schools/{schoolId}/students")
@RequiredArgsConstructor
@Validated
@Tag(name = "Students", description = "Student management scoped to a school. All operations require a valid schoolId path parameter.")
@SecurityRequirement(name = "BearerAuth")
public class StudentController {

    private final StudentService studentService;

    @Operation(
            summary = "List students for a school",
            description = "Returns all students belonging to the specified school. Pass `includeInactive=true` to include deactivated records."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Student list returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School not found", content = @Content)
    })
    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentResponse>>> getStudents(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "When true, include deactivated students", required = false)
            @RequestParam(defaultValue = "false") boolean includeInactive) {

        List<StudentResponse> students = includeInactive
                ? studentService.getAllStudentsBySchool(schoolId)
                : studentService.getActiveStudentsBySchool(schoolId);

        return ResponseEntity.ok(ApiResponse.success(students));
    }

    @Operation(
            summary = "Get a student by ID",
            description = "Returns a single student record scoped to the given school."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Student returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School or student not found", content = @Content)
    })
    @GetMapping("/{studentId}")
    public ResponseEntity<ApiResponse<StudentResponse>> getStudent(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the student", required = true)
            @PathVariable UUID studentId) {
        return ResponseEntity.ok(ApiResponse.success(studentService.getStudent(schoolId, studentId)));
    }

    @Operation(
            summary = "Enroll a new student",
            description = "Creates a new student record within the specified school. Email must be unique per school."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Student created"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School not found", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Email or student number already in use", content = @Content)
    })
    @PostMapping
    public ResponseEntity<ApiResponse<StudentResponse>> createStudent(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Valid @RequestBody CreateStudentRequest request) {

        // Ensure path variable and body are consistent
        request.setSchoolId(schoolId);

        StudentResponse created = studentService.createStudent(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @Operation(
            summary = "Update a student",
            description = "Partially updates a student record. Only provided fields are changed."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Student updated"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School or student not found", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Email or student number already in use", content = @Content)
    })
    @PatchMapping("/{studentId}")
    public ResponseEntity<ApiResponse<StudentResponse>> updateStudent(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the student", required = true)
            @PathVariable UUID studentId,
            @Valid @RequestBody UpdateStudentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(studentService.updateStudent(schoolId, studentId, request)));
    }

    @Operation(
            summary = "Deactivate a student",
            description = "Soft-deletes a student by setting isActive=false. The record is retained for historical grading data."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204", description = "Student deactivated"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School or student not found", content = @Content)
    })
    @DeleteMapping("/{studentId}")
    public ResponseEntity<Void> deactivateStudent(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the student", required = true)
            @PathVariable UUID studentId) {
        studentService.deactivateStudent(schoolId, studentId);
        return ResponseEntity.noContent().build();
    }
}
