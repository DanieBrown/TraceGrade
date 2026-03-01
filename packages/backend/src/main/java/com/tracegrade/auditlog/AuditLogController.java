package com.tracegrade.auditlog;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import com.tracegrade.dto.response.ApiResponse;
import com.tracegrade.dto.response.GradeAuditLogResponse;

/**
 * REST controller exposing read-only access to the AI grade audit log.
 *
 * <p>Access is restricted to the {@code ADMIN} role at both the HTTP security layer
 * (via {@code SecurityConfig}) and at the method level (via {@code @PreAuthorize}).
 * No mutating endpoints are exposed on this controller.
 */
@RestController
@RequestMapping("/api/audit/grades")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Audit Logs", description = "Read-only access to the AI grade audit trail. ADMIN role required.")
@SecurityRequirement(name = "BearerAuth")
public class AuditLogController {

    private final AuditLogService auditLogService;

    /**
     * Query AI grade audit logs with optional filters.
     *
     * <p>All query parameters are optional. Supplying none returns all records.
     * When both {@code from} and {@code to} are provided, {@code from}
     * must be before {@code to}; otherwise HTTP 400 is returned (EC-3).
     *
     * @param studentId  optional filter by student UUID
     * @param from       optional lower bound (inclusive) on the event timestamp
     * @param to         optional upper bound (inclusive) on the event timestamp
     * @return {@code 200 OK} with {@code ApiResponse<List<GradeAuditLogResponse>>}
     */
    @Operation(
            summary = "Query AI grade audit logs",
            description = "Returns audit records filterable by studentId and date range. ADMIN role required."
    )
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "200",
                    description = "Audit log entries matching the supplied filters"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "400",
                    description = "from must be before to",
                    content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "401",
                    description = "Unauthenticated",
                    content = @Content),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(
                    responseCode = "403",
                    description = "Authenticated but not ADMIN",
                    content = @Content)
    })
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<GradeAuditLogResponse>>> queryAuditLogs(

            @Parameter(description = "Filter results by student UUID (optional)")
            @RequestParam(required = false) UUID studentId,

            @Parameter(description = "Lower bound (inclusive) on the event timestamp — ISO-8601 UTC, e.g. 2024-01-01T00:00:00Z (optional)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,

            @Parameter(description = "Upper bound (inclusive) on the event timestamp — ISO-8601 UTC, e.g. 2024-12-31T23:59:59Z (optional)")
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {

        // EC-3: validate date range ordering when both bounds are supplied
        if (from != null && to != null && from.isAfter(to)) {
            log.warn("Invalid audit log query: from {} is after to {}", from, to);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "from must be before to");
        }

        List<GradeAuditLogResponse> results = auditLogService.queryAuditLogs(studentId, from, to);
        return ResponseEntity.ok(ApiResponse.success(results));
    }
}
