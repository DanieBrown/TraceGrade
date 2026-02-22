package com.tracegrade.dto.request;

import com.tracegrade.domain.model.SubmissionStatus;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request body for updating the processing status of a student submission")
public class UpdateSubmissionStatusRequest {

    @NotNull
    @Schema(description = "New status for the submission", example = "PROCESSING", requiredMode = Schema.RequiredMode.REQUIRED,
            allowableValues = {"PENDING", "PROCESSING", "COMPLETED", "FAILED"})
    private SubmissionStatus status;
}
