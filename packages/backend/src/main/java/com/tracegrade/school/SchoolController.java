package com.tracegrade.school;

import com.tracegrade.domain.model.SchoolType;
import com.tracegrade.dto.request.CreateSchoolRequest;
import com.tracegrade.dto.request.UpdateSchoolRequest;
import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.dto.response.SchoolResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
@RequestMapping("/api/schools")
@RequiredArgsConstructor
@Validated
@Tag(name = "Schools", description = "Multi-tenant school management. Schools are the top-level tenant entity in TraceGrade.")
@SecurityRequirement(name = "BearerAuth")
public class SchoolController {

    private final SchoolService schoolService;

    @Operation(
            summary = "List schools",
            description = "Returns all active schools. Optionally filter by school type (e.g. PRIMARY, HIGH, UNIVERSITY)."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "School list returned")
    })
    @GetMapping
    public ResponseEntity<ApiResponse<List<SchoolResponse>>> getSchools(
            @Parameter(description = "Filter by school type", required = false)
            @RequestParam(required = false) SchoolType type) {

        List<SchoolResponse> schools = type != null
                ? schoolService.getSchoolsByType(type)
                : schoolService.getAllActiveSchools();

        return ResponseEntity.ok(ApiResponse.success(schools));
    }

    @Operation(
            summary = "Get a school by ID",
            description = "Returns a single active school record."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "School returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School not found", content = @Content)
    })
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SchoolResponse>> getSchool(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(schoolService.getSchoolById(id)));
    }

    @Operation(
            summary = "Create a school",
            description = "Registers a new school in the system. The school name must be unique."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "School created"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid request payload", content = @Content)
    })
    @PostMapping
    public ResponseEntity<ApiResponse<SchoolResponse>> createSchool(
            @Valid @RequestBody CreateSchoolRequest request) {

        SchoolResponse response = schoolService.createSchool(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(
            summary = "Update a school",
            description = "Partially updates a school's details. Only fields provided in the request body are changed."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "School updated"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid request payload", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School not found", content = @Content)
    })
    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<SchoolResponse>> updateSchool(
            @Parameter(description = "UUID of the school to update", required = true)
            @PathVariable UUID id,
            @Valid @RequestBody UpdateSchoolRequest request) {

        return ResponseEntity.ok(ApiResponse.success(schoolService.updateSchool(id, request)));
    }

    @Operation(
            summary = "Deactivate a school",
            description = "Soft-deletes the school by marking it inactive. The record is retained in the database."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "School deactivated"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School not found", content = @Content)
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deactivateSchool(
            @Parameter(description = "UUID of the school to deactivate", required = true)
            @PathVariable UUID id) {
        schoolService.deactivateSchool(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
