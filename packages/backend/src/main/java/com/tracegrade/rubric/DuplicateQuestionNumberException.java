package com.tracegrade.rubric;

import java.util.UUID;

public class DuplicateQuestionNumberException extends RuntimeException {

    public DuplicateQuestionNumberException(UUID examTemplateId, Integer questionNumber) {
        super("Question number " + questionNumber
                + " already exists for exam template: " + examTemplateId);
    }
}
