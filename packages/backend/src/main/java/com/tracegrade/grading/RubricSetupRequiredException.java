package com.tracegrade.grading;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public class RubricSetupRequiredException extends RuntimeException {

    public RubricSetupRequiredException(UUID examTemplateId, int requiredQuestionCount,
                                        int configuredRubricCount, List<Integer> missingQuestionNumbers) {
        super(buildMessage(examTemplateId, requiredQuestionCount, configuredRubricCount, missingQuestionNumbers));
    }

    private static String buildMessage(UUID examTemplateId, int requiredQuestionCount,
                                       int configuredRubricCount, List<Integer> missingQuestionNumbers) {
        if (requiredQuestionCount <= 0) {
            return "Set up at least one answer rubric before using AI grading for this exam.";
        }

        String missingQuestions = missingQuestionNumbers == null || missingQuestionNumbers.isEmpty()
                ? ""
                : " Missing rubric questions: " + missingQuestionNumbers.stream()
                        .map(String::valueOf)
                        .collect(Collectors.joining(", ")) + ".";

        return String.format(
                "Set up answer rubrics for all %d questions before using AI grading for exam template %s. Currently configured: %d.%s",
                requiredQuestionCount,
                examTemplateId,
                configuredRubricCount,
                missingQuestions);
    }
}