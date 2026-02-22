package com.tracegrade.dto.response;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "Result of a batch exam file upload operation")
public class BatchUploadResponse {

    @Schema(description = "Per-file upload results")
    private List<FileUploadResponse> submissions;

    @Schema(description = "Total number of files submitted in the request", example = "5")
    private int totalFiles;

    @Schema(description = "Number of files successfully stored", example = "5")
    private int successfulUploads;
}
