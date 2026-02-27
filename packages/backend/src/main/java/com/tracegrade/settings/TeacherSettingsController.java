package com.tracegrade.settings;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.settings.dto.request.UpdateTeacherThresholdRequest;
import com.tracegrade.settings.dto.response.TeacherThresholdResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/teachers/me/grading-threshold")
@RequiredArgsConstructor
@Validated
@Tag(name = "Teacher Settings", description = "Current authenticated teacher grading settings")
@SecurityRequirement(name = "BearerAuth")
public class TeacherSettingsController {

    private final TeacherThresholdService teacherThresholdService;

    @Operation(
            summary = "Get authenticated teacher grading threshold",
            description = "Returns effective threshold, source, and optional teacher override for the current teacher."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Teacher threshold returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Authentication required", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Access denied", content = @Content)
    })
    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<TeacherThresholdResponse>> getCurrentTeacherThreshold(Authentication authentication) {
        TeacherThresholdResponse response = teacherThresholdService.getCurrentTeacherThreshold(authentication);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(
            summary = "Update authenticated teacher grading threshold",
            description = "Updates only the current authenticated teacher threshold. Accepted range is 0.00 to 1.00 with max 2 decimal places."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Teacher threshold updated"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid request payload", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Authentication required", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Access denied", content = @Content)
    })
    @PutMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<TeacherThresholdResponse>> updateCurrentTeacherThreshold(
            Authentication authentication,
            @Valid @RequestBody UpdateTeacherThresholdRequest request) {
        TeacherThresholdResponse response = teacherThresholdService
                .updateCurrentTeacherThreshold(authentication, request.getThreshold());
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
