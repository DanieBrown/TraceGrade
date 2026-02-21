package com.tracegrade.submission;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tracegrade.domain.model.GradingResult;
import com.tracegrade.domain.model.StudentSubmission;
import com.tracegrade.domain.model.SubmissionStatus;
import com.tracegrade.domain.repository.StudentSubmissionRepository;
import com.tracegrade.dto.response.SubmissionStatusResponse;
import com.tracegrade.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@SuppressWarnings("null") // UUID path params are guaranteed non-null by Spring MVC before reaching findById()
public class StudentSubmissionService {

    private final StudentSubmissionRepository submissionRepository;

    @Transactional(readOnly = true)
    public SubmissionStatusResponse getSubmission(UUID submissionId) {
        StudentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("StudentSubmission", submissionId));
        return toStatusResponse(submission);
    }

    @Transactional
    public SubmissionStatusResponse updateStatus(UUID submissionId, SubmissionStatus newStatus) {
        StudentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("StudentSubmission", submissionId));

        log.info("Updating submission {} status from {} to {}", submissionId, submission.getStatus(), newStatus);
        submission.setStatus(newStatus);
        StudentSubmission saved = submissionRepository.save(submission);
        return toStatusResponse(saved);
    }

    private SubmissionStatusResponse toStatusResponse(StudentSubmission submission) {
        GradingResult gr = submission.getGradingResult();
        SubmissionStatusResponse.GradingResultSummary summary = null;
        if (gr != null) {
            summary = SubmissionStatusResponse.GradingResultSummary.builder()
                    .gradeId(gr.getGradeId())
                    .aiScore(gr.getAiScore())
                    .finalScore(gr.getFinalScore())
                    .confidenceScore(gr.getConfidenceScore())
                    .needsReview(gr.getNeedsReview())
                    .teacherOverride(gr.getTeacherOverride())
                    .build();
        }
        return SubmissionStatusResponse.builder()
                .submissionId(submission.getId())
                .assignmentId(submission.getAssignmentId())
                .studentId(submission.getStudentId())
                .status(submission.getStatus().name())
                .submittedAt(submission.getSubmittedAt())
                .updatedAt(submission.getUpdatedAt())
                .gradingResult(summary)
                .build();
    }
}
