package com.tracegrade.enrollment;

import java.time.Instant;
import java.util.List;
import java.util.UUID;


import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tracegrade.domain.model.ClassEnrollment;
import com.tracegrade.domain.repository.ClassEnrollmentRepository;
import com.tracegrade.domain.repository.ClassRepository;
import com.tracegrade.domain.repository.StudentRepository;
import com.tracegrade.dto.response.EnrollmentResponse;
import com.tracegrade.exception.DuplicateResourceException;
import com.tracegrade.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class ClassEnrollmentService {

    private final ClassEnrollmentRepository enrollmentRepository;
    private final ClassRepository classRepository;
    private final StudentRepository studentRepository;

    @Transactional
    public EnrollmentResponse enrollStudent(UUID schoolId, UUID classId, UUID studentId) {
        // Verify class exists and belongs to the school
        classRepository.findByIdAndSchoolId(classId, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Class", classId));

        // Verify student exists and belongs to the same school
        studentRepository.findByIdAndSchoolId(studentId, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", studentId));

        // Prevent duplicate active enrollment
        if (enrollmentRepository.existsByClassIdAndStudentIdAndDroppedAtIsNull(classId, studentId)) {
            throw new DuplicateResourceException("Enrollment", "student", studentId.toString());
        }

        ClassEnrollment enrollment = ClassEnrollment.builder()
                .classId(classId)
                .studentId(studentId)
                .enrolledAt(Instant.now())
                .build();

        log.info("Enrolling student {} in class {} (school {})", studentId, classId, schoolId);
        return toResponse(enrollmentRepository.save(enrollment));
    }

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> listEnrollments(UUID schoolId, UUID classId) {
        // Verify class belongs to the school
        classRepository.findByIdAndSchoolId(classId, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Class", classId));

        return enrollmentRepository.findByClassIdAndDroppedAtIsNull(classId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void dropStudent(UUID schoolId, UUID classId, UUID enrollmentId) {
        // Verify class belongs to the school
        classRepository.findByIdAndSchoolId(classId, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Class", classId));

        // Find enrollment scoped to this class
        ClassEnrollment enrollment = enrollmentRepository.findByIdAndClassId(enrollmentId, classId)
                .orElseThrow(() -> new ResourceNotFoundException("Enrollment", enrollmentId));

        // If already dropped, treat as not found (enrollment is no longer active)
        if (enrollment.getDroppedAt() != null) {
            throw new ResourceNotFoundException("Enrollment", enrollmentId);
        }

        log.info("Dropping enrollment {} from class {} (school {})", enrollmentId, classId, schoolId);
        enrollment.setDroppedAt(Instant.now());
        enrollmentRepository.save(enrollment);
    }

    // ---- helpers ----

    private EnrollmentResponse toResponse(ClassEnrollment e) {
        return EnrollmentResponse.builder()
                .id(e.getId())
                .classId(e.getClassId())
                .studentId(e.getStudentId())
                .enrolledAt(e.getEnrolledAt())
                .droppedAt(e.getDroppedAt())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }
}
