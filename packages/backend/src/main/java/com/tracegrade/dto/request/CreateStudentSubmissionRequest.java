package com.tracegrade.dto.request;

import java.util.UUID;

import com.tracegrade.validation.ValidFileFormat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateStudentSubmissionRequest {

    @NotNull(message = "Assignment ID is required")
    private UUID assignmentId;

    @NotNull(message = "Student ID is required")
    private UUID studentId;

    private UUID examTemplateId;

    @NotBlank(message = "Submission image URLs are required")
    private String submissionImageUrls;

    @NotBlank(message = "Original format is required")
    @ValidFileFormat
    private String originalFormat;
}
