package com.tracegrade.gradecategory;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tracegrade.domain.model.GradeCategory;
import com.tracegrade.domain.repository.ClassRepository;
import com.tracegrade.domain.repository.GradeCategoryRepository;
import com.tracegrade.dto.request.CreateGradeCategoryRequest;
import com.tracegrade.dto.request.UpdateGradeCategoryRequest;
import com.tracegrade.dto.response.GradeCategoryResponse;
import com.tracegrade.exception.DuplicateResourceException;
import com.tracegrade.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class GradeCategoryService {

    private final GradeCategoryRepository gradeCategoryRepository;
    private final ClassRepository classRepository;

    @Transactional(readOnly = true)
    public List<GradeCategoryResponse> listCategories(UUID schoolId, UUID classId) {
        // Verify class belongs to the school
        classRepository.findByIdAndSchoolId(classId, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Class", classId));

        return gradeCategoryRepository.findByClassId(classId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public GradeCategoryResponse createCategory(UUID schoolId, UUID classId, CreateGradeCategoryRequest request) {
        // Verify class belongs to the school
        classRepository.findByIdAndSchoolId(classId, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Class", classId));

        // Check for duplicate name within the class
        if (gradeCategoryRepository.existsByClassIdAndNameIgnoreCase(classId, request.getName())) {
            throw new DuplicateResourceException("GradeCategory", "name", request.getName());
        }

        // Check total weight won't exceed 100
        BigDecimal existingSum = gradeCategoryRepository.sumWeightsByClassId(classId);
        if (existingSum.add(request.getWeight()).compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new IllegalArgumentException("Total category weight would exceed 100%");
        }

        GradeCategory category = GradeCategory.builder()
                .classId(classId)
                .name(request.getName())
                .weight(request.getWeight())
                .dropLowest(request.getDropLowest())
                .color(request.getColor())
                .build();

        log.info("Creating grade category '{}' for class {} (school {})", request.getName(), classId, schoolId);
        return toResponse(gradeCategoryRepository.save(category));
    }

    @Transactional
    public GradeCategoryResponse updateCategory(UUID schoolId, UUID classId, UUID categoryId,
            UpdateGradeCategoryRequest request) {
        // Verify class belongs to the school
        classRepository.findByIdAndSchoolId(classId, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Class", classId));

        // Find category scoped to this class
        GradeCategory category = gradeCategoryRepository.findByIdAndClassId(categoryId, classId)
                .orElseThrow(() -> new ResourceNotFoundException("GradeCategory", categoryId));

        // If name is changing, check for duplicate
        if (request.getName() != null && !request.getName().equalsIgnoreCase(category.getName())) {
            if (gradeCategoryRepository.existsByClassIdAndNameIgnoreCaseAndIdNot(classId, request.getName(),
                    categoryId)) {
                throw new DuplicateResourceException("GradeCategory", "name", request.getName());
            }
        }

        // If weight is changing, check total won't exceed 100 (exclude current category's weight)
        if (request.getWeight() != null) {
            BigDecimal existingSum = gradeCategoryRepository.sumWeightsByClassId(classId);
            BigDecimal sumWithoutCurrent = existingSum.subtract(category.getWeight());
            if (sumWithoutCurrent.add(request.getWeight()).compareTo(BigDecimal.valueOf(100)) > 0) {
                throw new IllegalArgumentException("Total category weight would exceed 100%");
            }
        }

        // Apply updates
        if (request.getName() != null) {
            category.setName(request.getName());
        }
        if (request.getWeight() != null) {
            category.setWeight(request.getWeight());
        }
        if (request.getDropLowest() != null) {
            category.setDropLowest(request.getDropLowest());
        }
        if (request.getColor() != null) {
            category.setColor(request.getColor());
        }

        log.info("Updating grade category {} for class {} (school {})", categoryId, classId, schoolId);
        return toResponse(gradeCategoryRepository.save(category));
    }

    @Transactional
    public void deleteCategory(UUID schoolId, UUID classId, UUID categoryId) {
        // Verify class belongs to the school
        classRepository.findByIdAndSchoolId(classId, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Class", classId));

        // Find category scoped to this class
        GradeCategory category = gradeCategoryRepository.findByIdAndClassId(categoryId, classId)
                .orElseThrow(() -> new ResourceNotFoundException("GradeCategory", categoryId));

        log.info("Deleting grade category {} from class {} (school {})", categoryId, classId, schoolId);
        gradeCategoryRepository.delete(category);
    }

    // ---- helpers ----

    private GradeCategoryResponse toResponse(GradeCategory gc) {
        return GradeCategoryResponse.builder()
                .id(gc.getId())
                .classId(gc.getClassId())
                .name(gc.getName())
                .weight(gc.getWeight())
                .dropLowest(gc.getDropLowest())
                .color(gc.getColor())
                .createdAt(gc.getCreatedAt())
                .updatedAt(gc.getUpdatedAt())
                .build();
    }
}
