package com.tracegrade.dto.request;

import java.util.UUID;

import org.springframework.web.multipart.MultipartFile;

import com.tracegrade.validation.ValidFileUpload;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FileUploadRequest {

    @NotNull(message = "Assignment ID is required")
    private UUID assignmentId;

    @NotNull(message = "File is required")
    @ValidFileUpload
    private MultipartFile file;
}
