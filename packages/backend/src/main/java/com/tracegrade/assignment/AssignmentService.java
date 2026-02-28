package com.tracegrade.assignment;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tracegrade.domain.model.Assignment;
import com.tracegrade.domain.repository.AssignmentRepository;
import com.tracegrade.domain.repository.ClassRepository;
import com.tracegrade.domain.repository.GradeCategoryRepository;
import com.tracegrade.dto.request.CreateAssignmentRequest;
import com.tracegrade.dto.request.UpdateAssignmentRequest;
import com.tracegrade.dto.response.AssignmentResponse;
import com.tracegrade.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final ClassRepository classRepository;
    private final GradeCategoryRepository gradeCategoryRepository;

    @Transactional(readOnly = true)
    public List<AssignmentResponse> listAssignments(UUID schoolId, UUID classId) {
        // Verify class belongs to the school
        classRepository.findByIdAndSchoolId(classId, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Class", classId));

        return assignmentRepository.findByClassId(classId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AssignmentResponse getAssignment(UUID schoolId, UUID classId, UUID assignmentId) {
        // Verify class belongs to the school
        classRepository.findByIdAndSchoolId(classId, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Class", classId));

        Assignment assignment = assignmentRepository.findByIdAndClassId(assignmentId, classId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment", assignmentId));

        return toResponse(assignment);
    }

    @Transactional
    public AssignmentResponse createAssignment(UUID schoolId, UUID classId, CreateAssignmentRequest request) {
        // Verify class belongs to the school
        classRepository.findByIdAndSchoolId(classId, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Class", classId));

        // Validate that categoryId belongs to this class
        gradeCategoryRepository.findByIdAndClassId(request.getCategoryId(), classId)
                .orElseThrow(() -> new IllegalArgumentException("Category does not belong to this class"));

        boolean published = request.getIsPublished() != null ? request.getIsPublished() : true;

        Assignment assignment = Assignment.builder()
                .classId(classId)
                .categoryId(request.getCategoryId())
                .name(request.getName())
                .description(request.getDescription())
                .maxPoints(request.getMaxPoints())
                .dueDate(request.getDueDate())
                .assignedDate(request.getAssignedDate())
                .isPublished(published)
                .build();

        log.info("Creating assignment '{}' for class {} (school {})", request.getName(), classId, schoolId);
        return toResponse(assignmentRepository.save(assignment));
    }

    @Transactional
    public AssignmentResponse updateAssignment(UUID schoolId, UUID classId, UUID assignmentId,
            UpdateAssignmentRequest request) {
        // Verify class belongs to the school
        classRepository.findByIdAndSchoolId(classId, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Class", classId));

        // Find assignment scoped to this class
        Assignment assignment = assignmentRepository.findByIdAndClassId(assignmentId, classId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment", assignmentId));

        // If categoryId is changing, validate it belongs to this class
        if (request.getCategoryId() != null) {
            gradeCategoryRepository.findByIdAndClassId(request.getCategoryId(), classId)
                    .orElseThrow(() -> new IllegalArgumentException("Category does not belong to this class"));
            assignment.setCategoryId(request.getCategoryId());
        }

        // Apply partial updates — only non-null fields
        if (request.getName() != null) {
            assignment.setName(request.getName());
        }
        if (request.getDescription() != null) {
            assignment.setDescription(request.getDescription());
        }
        if (request.getMaxPoints() != null) {
            assignment.setMaxPoints(request.getMaxPoints());
        }
        if (request.getDueDate() != null) {
            assignment.setDueDate(request.getDueDate());
        }
        if (request.getAssignedDate() != null) {
            assignment.setAssignedDate(request.getAssignedDate());
        }
        if (request.getIsPublished() != null) {
            assignment.setIsPublished(request.getIsPublished());
        }

        log.info("Updating assignment {} for class {} (school {})", assignmentId, classId, schoolId);
        return toResponse(assignmentRepository.save(assignment));
    }

    @Transactional
    public void deleteAssignment(UUID schoolId, UUID classId, UUID assignmentId) {
        // Verify class belongs to the school
        classRepository.findByIdAndSchoolId(classId, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Class", classId));

        // Find assignment scoped to this class
        Assignment assignment = assignmentRepository.findByIdAndClassId(assignmentId, classId)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment", assignmentId));

        log.info("Deleting assignment {} from class {} (school {})", assignmentId, classId, schoolId);
        assignmentRepository.delete(assignment);
    }

    // ---- helpers ----

    private AssignmentResponse toResponse(Assignment a) {
        return AssignmentResponse.builder()
                .id(a.getId())
                .classId(a.getClassId())
                .categoryId(a.getCategoryId())
                .name(a.getName())
                .description(a.getDescription())
                .maxPoints(a.getMaxPoints())
                .dueDate(a.getDueDate())
                .assignedDate(a.getAssignedDate())
                .isPublished(a.getIsPublished())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }
}
