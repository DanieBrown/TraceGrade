package com.tracegrade.school;

import com.tracegrade.domain.model.SchoolType;
import com.tracegrade.dto.request.CreateSchoolRequest;
import com.tracegrade.dto.request.UpdateSchoolRequest;
import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.dto.response.SchoolResponse;
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
public class SchoolController {

    private final SchoolService schoolService;

    /**
     * List all active schools, optionally filtered by type.
     *
     * GET /api/schools
     * GET /api/schools?type=HIGH
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<SchoolResponse>>> getSchools(
            @RequestParam(required = false) SchoolType type) {

        List<SchoolResponse> schools = type != null
                ? schoolService.getSchoolsByType(type)
                : schoolService.getAllActiveSchools();

        return ResponseEntity.ok(ApiResponse.success(schools));
    }

    /**
     * Retrieve a single school by ID.
     *
     * GET /api/schools/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SchoolResponse>> getSchool(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(schoolService.getSchoolById(id)));
    }

    /**
     * Create a new school.
     *
     * POST /api/schools
     */
    @PostMapping
    public ResponseEntity<ApiResponse<SchoolResponse>> createSchool(
            @Valid @RequestBody CreateSchoolRequest request) {

        SchoolResponse response = schoolService.createSchool(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * Partially update a school's details.
     *
     * PATCH /api/schools/{id}
     */
    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<SchoolResponse>> updateSchool(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateSchoolRequest request) {

        return ResponseEntity.ok(ApiResponse.success(schoolService.updateSchool(id, request)));
    }

    /**
     * Soft-delete a school by marking it inactive.
     *
     * DELETE /api/schools/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deactivateSchool(@PathVariable UUID id) {
        schoolService.deactivateSchool(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
