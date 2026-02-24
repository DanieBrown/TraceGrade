package com.tracegrade.examtemplate;

import com.tracegrade.dto.request.CreateExamTemplateRequest;
import com.tracegrade.dto.request.UpdateExamTemplateRequest;
import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.dto.response.ExamTemplateResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
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
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/exam-templates")
@RequiredArgsConstructor
@Validated
@Tag(name = "Exam Templates", description = "Manage reusable exam templates for teachers.")
@SecurityRequirement(name = "BearerAuth")
public class ExamTemplateController {

    private final ExamTemplateService examTemplateService;

    @Operation(
            summary = "Create exam template",
            description = "Creates a new exam template for a teacher."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "Exam template created"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid request payload", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Template with same name already exists", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "415", description = "Unsupported media type", content = @Content)
    })
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<ExamTemplateResponse>> createExamTemplate(
                        Authentication authentication,
            @Valid @RequestBody CreateExamTemplateRequest request) {
                UUID teacherId = resolveTeacherId(authentication);
                ExamTemplateResponse response = examTemplateService.createExamTemplate(teacherId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @Operation(
            summary = "List exam templates",
            description = "Returns authenticated teacher exam templates. Optional query parameters can filter by subject and grade level."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Exam templates returned")
    })
    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<List<ExamTemplateResponse>>> getExamTemplates(
                        Authentication authentication,
            @Parameter(description = "Optional subject filter")
            @RequestParam(required = false) String subject,
            @Parameter(description = "Optional grade level filter")
            @RequestParam(required = false) String gradeLevel) {
                UUID teacherId = resolveTeacherId(authentication);
                List<ExamTemplateResponse> response = examTemplateService.getExamTemplates(teacherId, subject, gradeLevel);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(
            summary = "Get exam template by ID",
            description = "Returns a single exam template record."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Exam template returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Exam template not found", content = @Content)
    })
    @GetMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<ExamTemplateResponse>> getExamTemplateById(
                        Authentication authentication,
            @Parameter(description = "Exam template UUID", required = true)
            @PathVariable UUID id) {
                UUID teacherId = resolveTeacherId(authentication);
                return ResponseEntity.ok(ApiResponse.success(examTemplateService.getExamTemplateById(teacherId, id)));
    }

    @Operation(
            summary = "Update exam template",
            description = "Partially updates an existing exam template."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Exam template updated"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid request payload", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Exam template not found", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Template with same name already exists", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "415", description = "Unsupported media type", content = @Content)
    })
    @PatchMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<ExamTemplateResponse>> updateExamTemplate(
                        Authentication authentication,
            @Parameter(description = "Exam template UUID", required = true)
            @PathVariable UUID id,
            @Valid @RequestBody UpdateExamTemplateRequest request) {
                UUID teacherId = resolveTeacherId(authentication);
                return ResponseEntity.ok(ApiResponse.success(examTemplateService.updateExamTemplate(teacherId, id, request)));
    }

    @Operation(
            summary = "Delete exam template",
            description = "Permanently deletes an exam template."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "204", description = "Exam template deleted"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Exam template not found", content = @Content)
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExamTemplate(
                        Authentication authentication,
            @Parameter(description = "Exam template UUID", required = true)
            @PathVariable UUID id) {
                UUID teacherId = resolveTeacherId(authentication);
                examTemplateService.deleteExamTemplate(teacherId, id);
        return ResponseEntity.noContent().build();
    }

        private UUID resolveTeacherId(Authentication authentication) {
                if (authentication == null || !authentication.isAuthenticated()) {
                        throw new AccessDeniedException("Authentication is required");
                }

                UUID teacherId = extractTeacherId(authentication.getPrincipal());
                if (teacherId == null) {
                        teacherId = extractTeacherId(authentication.getDetails());
                }
                if (teacherId == null) {
                        teacherId = extractTeacherId(authentication.getName());
                }

                if (teacherId != null) {
                        return teacherId;
                }

                throw new AccessDeniedException("Authenticated principal does not contain a valid teacher identifier");
        }

        private UUID extractTeacherId(Object source) {
                if (source == null) {
                        return null;
                }

                if (source instanceof UUID uuid) {
                        return uuid;
                }

                if (source instanceof CharSequence value) {
                        return parseUuid(value.toString());
                }

                if (source instanceof Map<?, ?> attributes) {
                        for (String key : List.of("teacher_id", "teacherId", "user_id", "userId", "sub", "id")) {
                                UUID candidate = extractTeacherId(attributes.get(key));
                                if (candidate != null) {
                                        return candidate;
                                }
                        }
                        return null;
                }

                UUID fromIdAccessor = invokeNoArgUuidAccessor(source, "getId");
                if (fromIdAccessor != null) {
                        return fromIdAccessor;
                }

                UUID fromAttributesAccessor = invokeClaimsAccessor(source, "getAttributes");
                if (fromAttributesAccessor != null) {
                        return fromAttributesAccessor;
                }

                UUID fromClaimsAccessor = invokeClaimsAccessor(source, "getClaims");
                if (fromClaimsAccessor != null) {
                        return fromClaimsAccessor;
                }

                UUID fromSubjectAccessor = invokeNoArgUuidAccessor(source, "getSubject");
                if (fromSubjectAccessor != null) {
                        return fromSubjectAccessor;
                }

                return null;
        }

        private UUID invokeClaimsAccessor(Object source, String methodName) {
                try {
                        Object value = source.getClass().getMethod(methodName).invoke(source);
                        return extractTeacherId(value);
                } catch (ReflectiveOperationException | RuntimeException ignored) {
                        return null;
                }
        }

        private UUID invokeNoArgUuidAccessor(Object source, String methodName) {
                try {
                        Object value = source.getClass().getMethod(methodName).invoke(source);
                        return extractTeacherId(value);
                } catch (ReflectiveOperationException | RuntimeException ignored) {
                        return null;
                }
        }

        private UUID parseUuid(String value) {
                if (value == null || value.isBlank()) {
                        return null;
                }

                try {
                        return UUID.fromString(value);
                } catch (IllegalArgumentException ex) {
                        return null;
                }
        }
}