package com.tracegrade.settings;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.settings.dto.request.UpdateGradingProviderRequest;
import com.tracegrade.settings.dto.response.GradingProviderResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/settings/grading")
@RequiredArgsConstructor
@Validated
@Tag(name = "Grading Settings", description = "Teacher AI grading provider selection")
@SecurityRequirement(name = "BearerAuth")
public class GradingProviderController {

    private final GradingProviderService gradingProviderService;

    @Operation(
            summary = "Get current teacher grading provider",
            description = "Returns the teacher's selected AI grading provider and all available options."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Grading provider returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Authentication required", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Access denied", content = @Content)
    })
    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<GradingProviderResponse>> getCurrentProvider(Authentication authentication) {
        GradingProviderResponse response = gradingProviderService.getCurrentProvider(authentication);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @Operation(
            summary = "Update teacher grading provider",
            description = "Updates the AI provider used to grade this teacher's exam submissions. Returns PROVIDER_NOT_CONFIGURED error if the selected provider's API key is not set."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Grading provider updated"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid or unconfigured provider", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Authentication required", content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "403", description = "Access denied", content = @Content)
    })
    @PatchMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<GradingProviderResponse>> updateProvider(
            Authentication authentication,
            @Valid @RequestBody UpdateGradingProviderRequest request) {
        GradingProviderResponse response = gradingProviderService.updateProvider(authentication, request.getProvider());
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}