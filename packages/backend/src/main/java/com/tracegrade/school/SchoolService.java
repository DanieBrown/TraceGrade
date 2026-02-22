package com.tracegrade.school;

import com.tracegrade.domain.model.School;
import com.tracegrade.domain.model.SchoolType;
import com.tracegrade.domain.repository.SchoolRepository;
import com.tracegrade.dto.request.CreateSchoolRequest;
import com.tracegrade.dto.request.UpdateSchoolRequest;
import com.tracegrade.dto.response.SchoolResponse;
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
@SuppressWarnings("null") // UUID path params are guaranteed non-null by Spring MVC before reaching findById()
public class SchoolService {

    private final SchoolRepository schoolRepository;

    @Transactional(readOnly = true)
    public List<SchoolResponse> getAllActiveSchools() {
        return schoolRepository.findByIsActiveTrue().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SchoolResponse> getSchoolsByType(SchoolType schoolType) {
        return schoolRepository.findBySchoolTypeAndIsActiveTrue(schoolType).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SchoolResponse getSchoolById(UUID id) {
        return toResponse(findById(id));
    }

    @Transactional
    public SchoolResponse createSchool(CreateSchoolRequest request) {
        School school = School.builder()
                .name(request.getName())
                .schoolType(request.getSchoolType())
                .address(request.getAddress())
                .phone(request.getPhone())
                .email(request.getEmail())
                .timezone(request.getTimezone())
                .build();

        log.info("Creating school: name={}, type={}", request.getName(), request.getSchoolType());
        return toResponse(schoolRepository.save(school));
    }

    @Transactional
    public SchoolResponse updateSchool(UUID id, UpdateSchoolRequest request) {
        School school = findById(id);

        if (request.getName() != null) school.setName(request.getName());
        if (request.getSchoolType() != null) school.setSchoolType(request.getSchoolType());
        if (request.getAddress() != null) school.setAddress(request.getAddress());
        if (request.getPhone() != null) school.setPhone(request.getPhone());
        if (request.getEmail() != null) school.setEmail(request.getEmail());
        if (request.getTimezone() != null) school.setTimezone(request.getTimezone());
        if (request.getIsActive() != null) school.setIsActive(request.getIsActive());

        log.info("Updating school {}", id);
        return toResponse(schoolRepository.save(school));
    }

    @Transactional
    public void deactivateSchool(UUID id) {
        School school = findById(id);
        log.info("Deactivating school {}", id);
        school.setIsActive(false);
        schoolRepository.save(school);
    }

    private School findById(UUID id) {
        return schoolRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("School", id));
    }

    private SchoolResponse toResponse(School school) {
        return SchoolResponse.builder()
                .id(school.getId())
                .name(school.getName())
                .schoolType(school.getSchoolType())
                .address(school.getAddress())
                .phone(school.getPhone())
                .email(school.getEmail())
                .timezone(school.getTimezone())
                .isActive(school.getIsActive())
                .createdAt(school.getCreatedAt())
                .updatedAt(school.getUpdatedAt())
                .build();
    }
}
