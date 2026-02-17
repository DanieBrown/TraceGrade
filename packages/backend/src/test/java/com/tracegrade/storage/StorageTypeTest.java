package com.tracegrade.storage;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class StorageTypeTest {

    @Test
    @DisplayName("EXAM_PDF should have 'exams/' key prefix")
    void examPdfPrefix() {
        assertThat(StorageType.EXAM_PDF.getKeyPrefix()).isEqualTo("exams/");
    }

    @Test
    @DisplayName("SUBMISSION_IMAGE should have 'submissions/' key prefix")
    void submissionImagePrefix() {
        assertThat(StorageType.SUBMISSION_IMAGE.getKeyPrefix()).isEqualTo("submissions/");
    }

    @Test
    @DisplayName("RUBRIC_IMAGE should have 'rubrics/' key prefix")
    void rubricImagePrefix() {
        assertThat(StorageType.RUBRIC_IMAGE.getKeyPrefix()).isEqualTo("rubrics/");
    }

    @Test
    @DisplayName("Should have exactly three storage types")
    void hasThreeTypes() {
        assertThat(StorageType.values()).hasSize(3);
    }
}
