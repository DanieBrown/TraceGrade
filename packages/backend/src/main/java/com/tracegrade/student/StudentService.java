package com.tracegrade.student;

import com.tracegrade.domain.model.School;
import com.tracegrade.domain.model.Student;
import com.tracegrade.domain.repository.SchoolRepository;
import com.tracegrade.domain.repository.StudentRepository;
import com.tracegrade.dto.request.CreateStudentRequest;
import com.tracegrade.dto.request.UpdateStudentRequest;
import com.tracegrade.dto.response.StudentResponse;
import com.tracegrade.exception.DuplicateResourceException;
import com.tracegrade.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class StudentService {

    private final StudentRepository studentRepository;
    private final SchoolRepository schoolRepository;

    @Transactional(readOnly = true)
    public List<StudentResponse> getActiveStudentsBySchool(UUID schoolId) {
        requireSchoolExists(schoolId);
        return studentRepository.findBySchoolIdAndIsActiveTrue(schoolId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StudentResponse> getAllStudentsBySchool(UUID schoolId) {
        requireSchoolExists(schoolId);
        return studentRepository.findBySchoolId(schoolId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StudentResponse getStudent(UUID schoolId, UUID studentId) {
        return toResponse(findByIdAndSchool(schoolId, studentId));
    }

    @Transactional
    public StudentResponse createStudent(CreateStudentRequest request) {
        School school = schoolRepository.findById(request.getSchoolId())
                .orElseThrow(() -> new ResourceNotFoundException("School", request.getSchoolId()));

        if (studentRepository.existsByEmailAndSchoolId(request.getEmail(), request.getSchoolId())) {
            throw new DuplicateResourceException("Student", "email", request.getEmail());
        }

        if (request.getStudentNumber() != null &&
                studentRepository.existsByStudentNumberAndSchoolId(request.getStudentNumber(), request.getSchoolId())) {
            throw new DuplicateResourceException("Student", "studentNumber", request.getStudentNumber());
        }

        Student student = Student.builder()
                .school(school)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail().toLowerCase())
                .studentNumber(request.getStudentNumber())
                .build();

        log.info("Creating student: email={}, schoolId={}", request.getEmail(), request.getSchoolId());
        return toResponse(studentRepository.save(student));
    }

    @Transactional
    public StudentResponse updateStudent(UUID schoolId, UUID studentId, UpdateStudentRequest request) {
        Student student = findByIdAndSchool(schoolId, studentId);

        if (request.getEmail() != null && !request.getEmail().equalsIgnoreCase(student.getEmail())) {
            if (studentRepository.existsByEmailAndSchoolId(request.getEmail(), schoolId)) {
                throw new DuplicateResourceException("Student", "email", request.getEmail());
            }
            student.setEmail(request.getEmail().toLowerCase());
        }

        if (request.getStudentNumber() != null && !request.getStudentNumber().equals(student.getStudentNumber())) {
            if (studentRepository.existsByStudentNumberAndSchoolId(request.getStudentNumber(), schoolId)) {
                throw new DuplicateResourceException("Student", "studentNumber", request.getStudentNumber());
            }
            student.setStudentNumber(request.getStudentNumber());
        }

        if (request.getFirstName() != null) student.setFirstName(request.getFirstName());
        if (request.getLastName() != null)  student.setLastName(request.getLastName());
        if (request.getIsActive() != null)  student.setIsActive(request.getIsActive());

        log.info("Updating student {}", studentId);
        return toResponse(studentRepository.save(student));
    }

    @Transactional
    public void deactivateStudent(UUID schoolId, UUID studentId) {
        Student student = findByIdAndSchool(schoolId, studentId);
        log.info("Deactivating student {}", studentId);
        student.setIsActive(false);
        studentRepository.save(student);
    }

    // ---- helpers ----

    private Student findByIdAndSchool(UUID schoolId, UUID studentId) {
        requireSchoolExists(schoolId);
        return studentRepository.findByIdAndSchoolId(studentId, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", studentId));
    }

    private void requireSchoolExists(UUID schoolId) {
        if (!schoolRepository.existsById(schoolId)) {
            throw new ResourceNotFoundException("School", schoolId);
        }
    }

    private StudentResponse toResponse(Student s) {
        return StudentResponse.builder()
                .id(s.getId())
                .schoolId(s.getSchool().getId())
                .firstName(s.getFirstName())
                .lastName(s.getLastName())
                .email(s.getEmail())
                .studentNumber(s.getStudentNumber())
                .isActive(s.getIsActive())
                .createdAt(s.getCreatedAt())
                .updatedAt(s.getUpdatedAt())
                .build();
    }
}
