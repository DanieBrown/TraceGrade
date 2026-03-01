package com.tracegrade.grade;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tracegrade.domain.model.Assignment;
import com.tracegrade.domain.model.Grade;
import com.tracegrade.domain.model.GradeStatus;
import com.tracegrade.domain.repository.AssignmentRepository;
import com.tracegrade.domain.repository.ClassRepository;
import com.tracegrade.domain.repository.GradeRepository;
import com.tracegrade.dto.request.BulkCreateGradesRequest;
import com.tracegrade.dto.request.CreateGradeRequest;
import com.tracegrade.dto.request.UpdateGradeRequest;
import com.tracegrade.dto.response.GradeResponse;
import com.tracegrade.exception.DuplicateResourceException;
import com.tracegrade.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class GradeService {

    private final GradeRepository gradeRepository;
    private final ClassRepository classRepository;
    private final AssignmentRepository assignmentRepository;

    @Transactional
    public GradeResponse createGrade(UUID schoolId, UUID classId, UUID assignmentId, CreateGradeRequest request) {
        validateOwnershipChain(schoolId, classId, assignmentId);

        if (gradeRepository.existsByStudentIdAndAssignmentId(request.getStudentId(), assignmentId)) {
            throw new DuplicateResourceException("Grade", "studentId+assignmentId",
                    request.getStudentId() + "+" + assignmentId);
        }

        Grade grade = buildGrade(assignmentId, request);

        log.info("Creating grade for student {} on assignment {} (class {}, school {})",
                request.getStudentId(), assignmentId, classId, schoolId);
        return toResponse(gradeRepository.save(grade));
    }

    @Transactional
    public List<GradeResponse> bulkCreateGrades(UUID schoolId, UUID classId, UUID assignmentId,
            BulkCreateGradesRequest request) {
        validateOwnershipChain(schoolId, classId, assignmentId);

        for (CreateGradeRequest item : request.getGrades()) {
            if (gradeRepository.existsByStudentIdAndAssignmentId(item.getStudentId(), assignmentId)) {
                throw new DuplicateResourceException("Grade", "studentId+assignmentId",
                        item.getStudentId() + "+" + assignmentId);
            }
        }

        List<Grade> grades = request.getGrades().stream()
                .map(item -> buildGrade(assignmentId, item))
                .collect(Collectors.toList());

        log.info("Bulk-creating {} grades for assignment {} (class {}, school {})",
                grades.size(), assignmentId, classId, schoolId);
        return gradeRepository.saveAll(grades).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<GradeResponse> listGradesByAssignment(UUID schoolId, UUID classId, UUID assignmentId) {
        validateOwnershipChain(schoolId, classId, assignmentId);

        log.info("Listing grades for assignment {} (class {}, school {})", assignmentId, classId, schoolId);
        return gradeRepository.findByAssignmentId(assignmentId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public GradeResponse getGrade(UUID schoolId, UUID classId, UUID assignmentId, UUID gradeId) {
        validateOwnershipChain(schoolId, classId, assignmentId);

        Grade grade = gradeRepository.findByIdAndAssignmentId(gradeId, assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Grade", gradeId));

        log.info("Fetching grade {} for assignment {} (class {}, school {})", gradeId, assignmentId, classId, schoolId);
        return toResponse(grade);
    }

    @Transactional
    public GradeResponse updateGrade(UUID schoolId, UUID classId, UUID assignmentId, UUID gradeId,
            UpdateGradeRequest request) {
        validateOwnershipChain(schoolId, classId, assignmentId);

        Grade grade = gradeRepository.findByIdAndAssignmentId(gradeId, assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Grade", gradeId));

        if (request.getStatus() != null) {
            grade.setStatus(request.getStatus());
        }
        if (request.getNotes() != null) {
            grade.setNotes(request.getNotes());
        }
        if (request.getGradedAt() != null) {
            grade.setGradedAt(request.getGradedAt());
        }

        // Apply pointsEarned unless status is being set to EXCUSED
        if (grade.getStatus() == GradeStatus.EXCUSED) {
            grade.setPointsEarned(null);
        } else if (request.getPointsEarned() != null) {
            grade.setPointsEarned(request.getPointsEarned());
        }

        log.info("Updating grade {} for assignment {} (class {}, school {})", gradeId, assignmentId, classId, schoolId);
        return toResponse(gradeRepository.save(grade));
    }

    @Transactional
    public void deleteGrade(UUID schoolId, UUID classId, UUID assignmentId, UUID gradeId) {
        validateOwnershipChain(schoolId, classId, assignmentId);

        Grade grade = gradeRepository.findByIdAndAssignmentId(gradeId, assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Grade", gradeId));

        log.info("Deleting grade {} from assignment {} (class {}, school {})", gradeId, assignmentId, classId, schoolId);
        gradeRepository.delete(grade);
    }

    // ---- helpers ----

    private void validateOwnershipChain(UUID schoolId, UUID classId, UUID assignmentId) {
        classRepository.findByIdAndSchoolId(classId, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Class", classId));

        assignmentRepository.findByIdAndClassId(assignmentId, classId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment", assignmentId));
    }

    private Grade buildGrade(UUID assignmentId, CreateGradeRequest request) {
        boolean excused = request.getStatus() == GradeStatus.EXCUSED;
        return Grade.builder()
                .assignmentId(assignmentId)
                .studentId(request.getStudentId())
                .pointsEarned(excused ? null : request.getPointsEarned())
                .status(request.getStatus())
                .notes(request.getNotes())
                .gradedAt(request.getGradedAt())
                .build();
    }

    private GradeResponse toResponse(Grade grade) {
        return GradeResponse.builder()
                .id(grade.getId())
                .assignmentId(grade.getAssignmentId())
                .studentId(grade.getStudentId())
                .pointsEarned(grade.getPointsEarned())
                .status(grade.getStatus())
                .notes(grade.getNotes())
                .gradedAt(grade.getGradedAt())
                .createdAt(grade.getCreatedAt())
                .updatedAt(grade.getUpdatedAt())
                .build();
    }
}
