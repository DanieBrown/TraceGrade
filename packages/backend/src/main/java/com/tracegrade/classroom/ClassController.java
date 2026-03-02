package com.tracegrade.classroom;

import com.tracegrade.dto.request.CreateClassRequest;
import com.tracegrade.dto.request.UpdateClassRequest;
import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.dto.response.ClassResponse;
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
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/schools/{schoolId}/classes")
@RequiredArgsConstructor
@Validated
@Tag(name = "Classes", description = "Class management scoped to a school. All operations require a valid schoolId path parameter.")
@SecurityRequirement(name = "BearerAuth")
public class ClassController {

    private final ClassService classService;

    @Operation(
            summary = "List classes for a school",
            description = "Returns all active classes belonging to the specified school. Pass `includeArchived=true` to include archived classes."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Class list returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School not found", content = @Content)
    })
    @GetMapping
    public ResponseEntity<ApiResponse<List<ClassResponse>>> getClasses(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "When true, include archived classes", required = false)
            @RequestParam(defaultValue = "false") boolean includeArchived) {

        List<ClassResponse> classes = includeArchived
                ? classService.getAllClassesBySchool(schoolId)
                : classService.getActiveClassesBySchool(schoolId);

        return ResponseEntity.ok(ApiResponse.success(classes));
    }

    @Operation(
            summary = "Get a class by ID",
            description = "Returns a single class record scoped to the given school."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Class returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School or class not found", content = @Content)
    })
    @GetMapping("/{classId}")
    public ResponseEntity<ApiResponse<ClassResponse>> getClass(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId) {
        return ResponseEntity.ok(ApiResponse.success(classService.getClass(schoolId, classId)));
    }

    @Operation(
            summary = "Create a new class",
            description = "Creates a new class within the specified school for the authenticated teacher."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Class created"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School not found", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Duplicate class name", content = @Content)
    })
    @PostMapping
    public ResponseEntity<ApiResponse<ClassResponse>> createClass(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Valid @RequestBody CreateClassRequest request,
            Authentication authentication) {

        request.setSchoolId(schoolId);

        // Extract teacher ID from the authenticated principal
        if (authentication != null && authentication.getPrincipal() instanceof UUID) {
            request.setTeacherId((UUID) authentication.getPrincipal());
        } else if (authentication != null && authentication.getPrincipal() instanceof String) {
            request.setTeacherId(UUID.fromString((String) authentication.getPrincipal()));
        }

        ClassResponse created = classService.createClass(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @Operation(
            summary = "Update a class",
            description = "Partially updates a class record. Only provided fields are changed."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Class updated"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School or class not found", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Duplicate class name", content = @Content)
    })
    @PutMapping("/{classId}")
    public ResponseEntity<ApiResponse<ClassResponse>> updateClass(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId,
            @Valid @RequestBody UpdateClassRequest request) {
        return ResponseEntity.ok(ApiResponse.success(classService.updateClass(schoolId, classId, request)));
    }

    @Operation(
            summary = "Archive a class",
            description = "Soft-deletes a class by setting isActive=false. The record is retained for historical data."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204", description = "Class archived"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School or class not found", content = @Content)
    })
    @DeleteMapping("/{classId}")
    public ResponseEntity<Void> archiveClass(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId) {
        classService.archiveClass(schoolId, classId);
        return ResponseEntity.noContent().build();
    }
}
