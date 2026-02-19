package com.tracegrade.openai;

import com.tracegrade.openai.dto.ExamGenerationRequest;
import com.tracegrade.openai.dto.ExamGenerationResponse;
import com.tracegrade.openai.dto.GradingRequest;
import com.tracegrade.openai.dto.GradingResponse;

public interface OpenAiService {

    /**
     * Generates structured exam questions using GPT-4o Chat Completions.
     */
    ExamGenerationResponse generateExam(ExamGenerationRequest request);

    /**
     * Grades a single handwritten submission image against a rubric using GPT-4o Vision.
     */
    GradingResponse gradeSubmission(GradingRequest request);
}
