package com.tracegrade.dashboard;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.dto.response.DashboardStatsResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/schools/{schoolId}/dashboard/stats")
@RequiredArgsConstructor
@Validated
@Tag(name = "Dashboard Stats", description = "School-scoped summary metrics used by the dashboard.")
@SecurityRequirement(name = "BearerAuth")
public class DashboardStatsController {

    private final DashboardStatsService dashboardStatsService;

    @Operation(
            summary = "Get dashboard statistics for a school",
            description = "Returns school-scoped summary metrics including active students, graded-this-week count, pending reviews, class average, and letter grade."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Dashboard statistics returned"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "School not found", content = @Content)
    })
    @GetMapping
    public ResponseEntity<ApiResponse<DashboardStatsResponse>> getDashboardStats(
            @Parameter(description = "UUID of the school", required = true)
            @PathVariable UUID schoolId) {
        DashboardStatsResponse response = dashboardStatsService.getDashboardStats(schoolId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
