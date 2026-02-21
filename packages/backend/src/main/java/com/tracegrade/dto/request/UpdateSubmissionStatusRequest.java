package com.tracegrade.dto.request;

import com.tracegrade.domain.model.SubmissionStatus;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSubmissionStatusRequest {

    @NotNull
    private SubmissionStatus status;
}
