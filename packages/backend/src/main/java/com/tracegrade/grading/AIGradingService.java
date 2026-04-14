package com.tracegrade.grading;

import com.tracegrade.openai.dto.GradingRequest;
import com.tracegrade.openai.dto.GradingResponse;

/**
 * Common contract for all AI grading providers.
 */
public interface AIGradingService {

    GradingResponse gradeSubmission(GradingRequest request);
}