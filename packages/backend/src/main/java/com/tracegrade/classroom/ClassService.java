package com.tracegrade.classroom;

import com.tracegrade.domain.model.Class;
import com.tracegrade.domain.model.School;
import com.tracegrade.domain.repository.ClassRepository;
import com.tracegrade.domain.repository.SchoolRepository;
import com.tracegrade.dto.request.CreateClassRequest;
import com.tracegrade.dto.request.UpdateClassRequest;
import com.tracegrade.dto.response.ClassResponse;
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
public class ClassService {

    private final ClassRepository classRepository;
    private final SchoolRepository schoolRepository;

    @Transactional(readOnly = true)
    public List<ClassResponse> getActiveClassesBySchool(UUID schoolId) {
        requireSchoolExists(schoolId);
        return classRepository.findBySchoolIdAndIsActiveTrue(schoolId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ClassResponse> getAllClassesBySchool(UUID schoolId) {
        requireSchoolExists(schoolId);
        return classRepository.findBySchoolId(schoolId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ClassResponse getClass(UUID schoolId, UUID classId) {
        return toResponse(findByIdAndSchool(schoolId, classId));
    }

    @Transactional
    public ClassResponse createClass(CreateClassRequest request) {
        School school = schoolRepository.findById(request.getSchoolId())
                .orElseThrow(() -> new ResourceNotFoundException("School", request.getSchoolId()));

        // Check for duplicate class name for same teacher, year, and period
        if (classRepository.existsBySchoolIdAndTeacherIdAndNameIgnoreCaseAndSchoolYearAndPeriodAndIsActiveTrue(
                request.getSchoolId(),
                request.getTeacherId(),
                request.getName(),
                request.getSchoolYear(),
                request.getPeriod())) {
            throw new DuplicateResourceException("Class", "name", request.getName());
        }

        Class clazz = Class.builder()
                .school(school)
                .teacherId(request.getTeacherId())
                .name(request.getName())
                .subject(request.getSubject())
                .period(request.getPeriod())
                .schoolYear(request.getSchoolYear())
                .gradingScale(request.getGradingScale())
                .build();

        log.info("Creating class: name={}, schoolId={}, teacherId={}",
                request.getName(), request.getSchoolId(), request.getTeacherId());
        return toResponse(classRepository.save(clazz));
    }

    @Transactional
    public ClassResponse updateClass(UUID schoolId, UUID classId, UpdateClassRequest request) {
        Class clazz = findByIdAndSchool(schoolId, classId);

        if (request.getName() != null && !request.getName().equalsIgnoreCase(clazz.getName())) {
            if (classRepository.existsBySchoolIdAndTeacherIdAndNameIgnoreCaseAndSchoolYearAndPeriodAndIsActiveTrueAndIdNot(
                    schoolId,
                    clazz.getTeacherId(),
                    request.getName(),
                    request.getSchoolYear() != null ? request.getSchoolYear() : clazz.getSchoolYear(),
                    request.getPeriod() != null ? request.getPeriod() : clazz.getPeriod(),
                    classId)) {
                throw new DuplicateResourceException("Class", "name", request.getName());
            }
            clazz.setName(request.getName());
        }

        if (request.getSubject() != null) clazz.setSubject(request.getSubject());
        if (request.getPeriod() != null) clazz.setPeriod(request.getPeriod());
        if (request.getSchoolYear() != null) clazz.setSchoolYear(request.getSchoolYear());
        if (request.getGradingScale() != null) clazz.setGradingScale(request.getGradingScale());
        if (request.getIsActive() != null) clazz.setIsActive(request.getIsActive());

        log.info("Updating class {}", classId);
        return toResponse(classRepository.save(clazz));
    }

    @Transactional
    public void archiveClass(UUID schoolId, UUID classId) {
        Class clazz = findByIdAndSchool(schoolId, classId);
        log.info("Archiving class {}", classId);
        clazz.setIsActive(false);
        classRepository.save(clazz);
    }

    // ---- helpers ----

    private Class findByIdAndSchool(UUID schoolId, UUID classId) {
        requireSchoolExists(schoolId);
        return classRepository.findByIdAndSchoolId(classId, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Class", classId));
    }

    private void requireSchoolExists(UUID schoolId) {
        if (!schoolRepository.existsById(schoolId)) {
            throw new ResourceNotFoundException("School", schoolId);
        }
    }

    private ClassResponse toResponse(Class c) {
        return ClassResponse.builder()
                .id(c.getId())
                .schoolId(c.getSchool().getId())
                .teacherId(c.getTeacherId())
                .name(c.getName())
                .subject(c.getSubject())
                .period(c.getPeriod())
                .schoolYear(c.getSchoolYear())
                .gradingScale(c.getGradingScale())
                .isActive(c.getIsActive())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
