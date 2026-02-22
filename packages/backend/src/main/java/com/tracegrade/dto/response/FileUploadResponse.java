package com.tracegrade.dto.response;

import java.time.Instant;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "Result for a single uploaded exam submission file")
public class FileUploadResponse {

    @Schema(description = "UUID of the newly created student submission record")
    private UUID submissionId;

    @Schema(description = "Storage URL of the uploaded file")
    private String fileUrl;

    @Schema(description = "Original file name as provided by the client", example = "exam-page1.jpg")
    private String fileName;

    @Schema(description = "Initial submission status after upload", example = "PENDING")
    private String status;

    @Schema(description = "UTC timestamp when the file was uploaded")
    private Instant uploadedAt;
}
