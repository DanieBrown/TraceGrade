package com.tracegrade.dto.request;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request body for bulk-creating grades for multiple students in one atomic operation")
public class BulkCreateGradesRequest {

    @NotEmpty
    @Size(max = 50)
    @Valid
    @Schema(
            description = "List of grade entries to create (1–50 items per request)",
            requiredMode = Schema.RequiredMode.REQUIRED
    )
    private List<CreateGradeRequest> grades;
}
