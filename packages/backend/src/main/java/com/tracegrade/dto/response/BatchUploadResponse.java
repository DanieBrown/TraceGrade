package com.tracegrade.dto.response;

import java.util.List;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BatchUploadResponse {

    private List<FileUploadResponse> submissions;
    private int totalFiles;
    private int successfulUploads;
}
