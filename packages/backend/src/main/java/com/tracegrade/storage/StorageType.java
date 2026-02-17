package com.tracegrade.storage;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum StorageType {

    EXAM_PDF("exams/"),
    SUBMISSION_IMAGE("submissions/"),
    RUBRIC_IMAGE("rubrics/");

    private final String keyPrefix;
}
