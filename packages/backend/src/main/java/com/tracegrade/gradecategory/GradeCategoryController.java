package com.tracegrade.gradecategory;

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

import com.tracegrade.dto.request.CreateGradeCategoryRequest;
import com.tracegrade.dto.request.UpdateGradeCategoryRequest;
import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.dto.response.GradeCategoryResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/schools/{schoolId}/classes/{classId}/categories")
@RequiredArgsConstructor
@Validated
@Tag(name = "Grade Categories", description = "Grade category management scoped to a class within a school. All operations require valid schoolId and classId path parameters.")
@SecurityRequirement(name = "BearerAuth")
public class GradeCategoryController {

    private final GradeCategoryService gradeCategoryService;

    @Operation(
            summary = "List grade categories for a class",
            description = "Returns all grade categories for the specified class."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Category list returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Class not found", content = @Content)
    })
    @GetMapping
    public ResponseEntity<ApiResponse<List<GradeCategoryResponse>>> listCategories(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId) {

        List<GradeCategoryResponse> categories = gradeCategoryService.listCategories(schoolId, classId);
        return ResponseEntity.ok(ApiResponse.success(categories));
    }

    @Operation(
            summary = "Create a grade category for a class",
            description = "Creates a new grade category for the specified class. Returns 409 if a category with the same name already exists, or 400 if total weights would exceed 100%."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Category created"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error or weight exceeds 100%", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Class not found", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Category name already exists in this class", content = @Content)
    })
    @PostMapping
    public ResponseEntity<ApiResponse<GradeCategoryResponse>> createCategory(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId,
            @Valid @RequestBody CreateGradeCategoryRequest request) {

        GradeCategoryResponse created = gradeCategoryService.createCategory(schoolId, classId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @Operation(
            summary = "Update a grade category",
            description = "Updates an existing grade category. All fields are optional. Returns 400 if weight update would cause total to exceed 100%."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Category updated"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error or weight exceeds 100%", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Class or category not found", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Category name already exists in this class", content = @Content)
    })
    @PutMapping("/{categoryId}")
    public ResponseEntity<ApiResponse<GradeCategoryResponse>> updateCategory(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId,
            @Parameter(description = "UUID of the category to update", required = true)
            @PathVariable UUID categoryId,
            @Valid @RequestBody UpdateGradeCategoryRequest request) {

        GradeCategoryResponse updated = gradeCategoryService.updateCategory(schoolId, classId, categoryId, request);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    @Operation(
            summary = "Delete a grade category",
            description = "Hard-deletes the grade category. Returns 404 if the category does not exist in the specified class."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204", description = "Category deleted"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Class or category not found", content = @Content)
    })
    @DeleteMapping("/{categoryId}")
    public ResponseEntity<Void> deleteCategory(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the class", required = true)
            @PathVariable UUID classId,
            @Parameter(description = "UUID of the category to delete", required = true)
            @PathVariable UUID categoryId) {

        gradeCategoryService.deleteCategory(schoolId, classId, categoryId);
        return ResponseEntity.noContent().build();
    }
}
