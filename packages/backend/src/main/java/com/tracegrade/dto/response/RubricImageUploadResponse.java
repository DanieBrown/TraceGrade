package com.tracegrade.dto.response;

import java.time.Instant;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "Result for an uploaded rubric reference image")
public class RubricImageUploadResponse {

    @Schema(description = "Public URL of the uploaded rubric image")
    private String fileUrl;

    @Schema(description = "Original uploaded file name", example = "teacher-answer-q1.jpg")
    private String fileName;

    @Schema(description = "UTC timestamp when the image was uploaded")
    private Instant uploadedAt;
}