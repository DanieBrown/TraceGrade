package com.tracegrade.gradecategory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.tracegrade.domain.model.Class;
import com.tracegrade.domain.model.GradeCategory;
import com.tracegrade.domain.model.School;
import com.tracegrade.domain.repository.ClassRepository;
import com.tracegrade.domain.repository.GradeCategoryRepository;
import com.tracegrade.dto.request.CreateGradeCategoryRequest;
import com.tracegrade.dto.request.UpdateGradeCategoryRequest;
import com.tracegrade.dto.response.GradeCategoryResponse;
import com.tracegrade.exception.DuplicateResourceException;
import com.tracegrade.exception.ResourceNotFoundException;

@ExtendWith(MockitoExtension.class)
class GradeCategoryServiceTest {

    @Mock
    private GradeCategoryRepository gradeCategoryRepository;

    @Mock
    private ClassRepository classRepository;

    @InjectMocks
    private GradeCategoryService gradeCategoryService;

    // ---- listCategories ----

    @Test
    @DisplayName("listCategories returns list of GradeCategoryResponse on success")
    void listCategories_success() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        GradeCategory cat1 = GradeCategory.builder()
                .classId(classId).name("Tests").weight(BigDecimal.valueOf(60)).dropLowest(0).build();
        GradeCategory cat2 = GradeCategory.builder()
                .classId(classId).name("Homework").weight(BigDecimal.valueOf(40)).dropLowest(0).build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(gradeCategoryRepository.findByClassId(classId)).thenReturn(List.of(cat1, cat2));

        List<GradeCategoryResponse> result = gradeCategoryService.listCategories(schoolId, classId);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getName()).isEqualTo("Tests");
        assertThat(result.get(1).getName()).isEqualTo("Homework");
    }

    @Test
    @DisplayName("listCategories throws ResourceNotFoundException when class not found")
    void listCategories_classNotFound() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> gradeCategoryService.listCategories(schoolId, classId))
                .isInstanceOf(ResourceNotFoundException.class);

        verifyNoInteractions(gradeCategoryRepository);
    }

    // ---- createCategory ----

    @Test
    @DisplayName("createCategory returns GradeCategoryResponse on success")
    void createCategory_success() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        CreateGradeCategoryRequest request = CreateGradeCategoryRequest.builder()
                .name("Tests")
                .weight(BigDecimal.valueOf(60))
                .dropLowest(0)
                .color("#FF5733")
                .build();

        GradeCategory saved = GradeCategory.builder()
                .classId(classId)
                .name("Tests")
                .weight(BigDecimal.valueOf(60))
                .dropLowest(0)
                .color("#FF5733")
                .build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(gradeCategoryRepository.existsByClassIdAndNameIgnoreCase(classId, "Tests")).thenReturn(false);
        when(gradeCategoryRepository.sumWeightsByClassId(classId)).thenReturn(BigDecimal.valueOf(0));
        when(gradeCategoryRepository.save(any(GradeCategory.class))).thenReturn(saved);

        GradeCategoryResponse response = gradeCategoryService.createCategory(schoolId, classId, request);

        assertThat(response).isNotNull();
        assertThat(response.getName()).isEqualTo("Tests");
        assertThat(response.getWeight()).isEqualByComparingTo(BigDecimal.valueOf(60));
        assertThat(response.getColor()).isEqualTo("#FF5733");

        verify(gradeCategoryRepository).save(any(GradeCategory.class));
    }

    @Test
    @DisplayName("createCategory throws DuplicateResourceException when name already exists")
    void createCategory_duplicateName() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        CreateGradeCategoryRequest request = CreateGradeCategoryRequest.builder()
                .name("Tests")
                .weight(BigDecimal.valueOf(60))
                .dropLowest(0)
                .build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(gradeCategoryRepository.existsByClassIdAndNameIgnoreCase(classId, "Tests")).thenReturn(true);

        assertThatThrownBy(() -> gradeCategoryService.createCategory(schoolId, classId, request))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    @DisplayName("createCategory throws IllegalArgumentException when weight would exceed 100%")
    void createCategory_weightExceeds100() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        CreateGradeCategoryRequest request = CreateGradeCategoryRequest.builder()
                .name("Quizzes")
                .weight(BigDecimal.valueOf(50))
                .dropLowest(0)
                .build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(gradeCategoryRepository.existsByClassIdAndNameIgnoreCase(classId, "Quizzes")).thenReturn(false);
        when(gradeCategoryRepository.sumWeightsByClassId(classId)).thenReturn(BigDecimal.valueOf(60));

        assertThatThrownBy(() -> gradeCategoryService.createCategory(schoolId, classId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Total category weight would exceed 100%");
    }

    // ---- updateCategory ----

    @Test
    @DisplayName("updateCategory updates fields and returns updated response")
    void updateCategory_success() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        GradeCategory existing = GradeCategory.builder()
                .classId(classId).name("Tests").weight(BigDecimal.valueOf(60)).dropLowest(0).build();

        UpdateGradeCategoryRequest request = UpdateGradeCategoryRequest.builder()
                .name("Exams")
                .weight(BigDecimal.valueOf(50))
                .dropLowest(1)
                .color("#123456")
                .build();

        GradeCategory updated = GradeCategory.builder()
                .classId(classId).name("Exams").weight(BigDecimal.valueOf(50)).dropLowest(1).color("#123456").build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(gradeCategoryRepository.findByIdAndClassId(categoryId, classId)).thenReturn(Optional.of(existing));
        when(gradeCategoryRepository.existsByClassIdAndNameIgnoreCaseAndIdNot(classId, "Exams", categoryId))
                .thenReturn(false);
        when(gradeCategoryRepository.sumWeightsByClassId(classId)).thenReturn(BigDecimal.valueOf(60));
        when(gradeCategoryRepository.save(any(GradeCategory.class))).thenReturn(updated);

        GradeCategoryResponse response = gradeCategoryService.updateCategory(schoolId, classId, categoryId, request);

        assertThat(response).isNotNull();
        assertThat(response.getName()).isEqualTo("Exams");
        assertThat(response.getWeight()).isEqualByComparingTo(BigDecimal.valueOf(50));
        assertThat(response.getDropLowest()).isEqualTo(1);
        assertThat(response.getColor()).isEqualTo("#123456");
    }

    @Test
    @DisplayName("updateCategory throws ResourceNotFoundException when category not found")
    void updateCategory_notFound() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(gradeCategoryRepository.findByIdAndClassId(categoryId, classId)).thenReturn(Optional.empty());

        UpdateGradeCategoryRequest request = UpdateGradeCategoryRequest.builder().name("Exams").build();

        assertThatThrownBy(() -> gradeCategoryService.updateCategory(schoolId, classId, categoryId, request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---- deleteCategory ----

    @Test
    @DisplayName("deleteCategory calls repository delete on success")
    void deleteCategory_success() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        GradeCategory category = GradeCategory.builder()
                .classId(classId).name("Tests").weight(BigDecimal.valueOf(60)).dropLowest(0).build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(gradeCategoryRepository.findByIdAndClassId(categoryId, classId)).thenReturn(Optional.of(category));

        gradeCategoryService.deleteCategory(schoolId, classId, categoryId);

        verify(gradeCategoryRepository).delete(category);
    }

    @Test
    @DisplayName("deleteCategory throws ResourceNotFoundException when category not found")
    void deleteCategory_notFound() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(gradeCategoryRepository.findByIdAndClassId(categoryId, classId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> gradeCategoryService.deleteCategory(schoolId, classId, categoryId))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
