package com.tracegrade.dto.response;

import java.time.Instant;
import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FileUploadResponse {

    private UUID submissionId;
    private String fileUrl;
    private String fileName;
    private String status;
    private Instant uploadedAt;
}
