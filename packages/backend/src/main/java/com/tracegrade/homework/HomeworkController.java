package com.tracegrade.homework;

import com.tracegrade.dto.request.CreateHomeworkRequest;
import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.dto.response.HomeworkResponse;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/schools/{schoolId}/homework")
@RequiredArgsConstructor
@Validated
@Tag(name = "Homework", description = "Homework assignment management scoped to a school.")
@SecurityRequirement(name = "BearerAuth")
public class HomeworkController {

    private final HomeworkService homeworkService;

    @Operation(
            summary = "List homework for a school",
            description = "Returns all homework assignments belonging to the specified school, ordered by most recent first."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Homework list returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School not found", content = @Content)
    })
    @GetMapping
    public ResponseEntity<ApiResponse<List<HomeworkResponse>>> getHomework(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId) {

        List<HomeworkResponse> homework = homeworkService.getHomeworkBySchool(schoolId);
        return ResponseEntity.ok(ApiResponse.success(homework));
    }

    @Operation(
            summary = "Get a homework assignment by ID",
            description = "Returns a single homework record scoped to the given school."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Homework returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School or homework not found", content = @Content)
    })
    @GetMapping("/{homeworkId}")
    public ResponseEntity<ApiResponse<HomeworkResponse>> getHomeworkById(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the homework", required = true)
            @PathVariable UUID homeworkId) {
        return ResponseEntity.ok(ApiResponse.success(homeworkService.getHomework(schoolId, homeworkId)));
    }

    @Operation(
            summary = "Create a homework assignment",
            description = "Creates a new homework assignment within the specified school."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Homework created"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Validation error", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School not found", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Title already in use", content = @Content)
    })
    @PostMapping
    public ResponseEntity<ApiResponse<HomeworkResponse>> createHomework(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Valid @RequestBody CreateHomeworkRequest request) {

        request.setSchoolId(schoolId);

        HomeworkResponse created = homeworkService.createHomework(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(created));
    }

    @Operation(
            summary = "Delete a homework assignment",
            description = "Permanently deletes a homework assignment."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204", description = "Homework deleted"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School or homework not found", content = @Content)
    })
    @DeleteMapping("/{homeworkId}")
    public ResponseEntity<Void> deleteHomework(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId,
            @Parameter(description = "UUID of the homework", required = true)
            @PathVariable UUID homeworkId) {
        homeworkService.deleteHomework(schoolId, homeworkId);
        return ResponseEntity.noContent().build();
    }
}
