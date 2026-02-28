package com.tracegrade.assignment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.tracegrade.domain.model.Assignment;
import com.tracegrade.domain.model.Class;
import com.tracegrade.domain.model.GradeCategory;
import com.tracegrade.domain.model.School;
import com.tracegrade.domain.repository.AssignmentRepository;
import com.tracegrade.domain.repository.ClassRepository;
import com.tracegrade.domain.repository.GradeCategoryRepository;
import com.tracegrade.dto.request.CreateAssignmentRequest;
import com.tracegrade.dto.request.UpdateAssignmentRequest;
import com.tracegrade.dto.response.AssignmentResponse;
import com.tracegrade.exception.ResourceNotFoundException;

@ExtendWith(MockitoExtension.class)
class AssignmentServiceTest {

    @Mock
    private AssignmentRepository assignmentRepository;

    @Mock
    private ClassRepository classRepository;

    @Mock
    private GradeCategoryRepository gradeCategoryRepository;

    @InjectMocks
    private AssignmentService assignmentService;

    // ---- listAssignments ----

    @Test
    @DisplayName("listAssignments returns list of AssignmentResponse on success")
    void listAssignments_success() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        Assignment a1 = Assignment.builder()
                .classId(classId).categoryId(categoryId).name("Quiz 1")
                .maxPoints(BigDecimal.valueOf(50)).isPublished(true).build();
        Assignment a2 = Assignment.builder()
                .classId(classId).categoryId(categoryId).name("Homework 1")
                .maxPoints(BigDecimal.valueOf(20)).isPublished(true).build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByClassId(classId)).thenReturn(List.of(a1, a2));

        List<AssignmentResponse> result = assignmentService.listAssignments(schoolId, classId);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getName()).isEqualTo("Quiz 1");
        assertThat(result.get(1).getName()).isEqualTo("Homework 1");
    }

    @Test
    @DisplayName("listAssignments_classNotFound_throws throws ResourceNotFoundException when class not found")
    void listAssignments_classNotFound_throws() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> assignmentService.listAssignments(schoolId, classId))
                .isInstanceOf(ResourceNotFoundException.class);

        verifyNoInteractions(assignmentRepository);
    }

    // ---- getAssignment ----

    @Test
    @DisplayName("getAssignment returns AssignmentResponse on success")
    void getAssignment_success() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        Assignment assignment = Assignment.builder()
                .classId(classId).categoryId(categoryId).name("Final Exam")
                .maxPoints(BigDecimal.valueOf(100)).isPublished(true).build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.of(assignment));

        AssignmentResponse result = assignmentService.getAssignment(schoolId, classId, assignmentId);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Final Exam");
        assertThat(result.getMaxPoints()).isEqualByComparingTo(BigDecimal.valueOf(100));
    }

    @Test
    @DisplayName("getAssignment throws ResourceNotFoundException when assignment not found")
    void getAssignment_notFound_throws() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> assignmentService.getAssignment(schoolId, classId, assignmentId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---- createAssignment ----

    @Test
    @DisplayName("createAssignment returns AssignmentResponse on success")
    void createAssignment_success() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        GradeCategory category = GradeCategory.builder()
                .classId(classId).name("Tests").weight(BigDecimal.valueOf(60)).dropLowest(0).build();

        CreateAssignmentRequest request = CreateAssignmentRequest.builder()
                .categoryId(categoryId)
                .name("Midterm Exam")
                .maxPoints(BigDecimal.valueOf(100))
                .dueDate(LocalDate.of(2026, 6, 15))
                .isPublished(true)
                .build();

        Assignment saved = Assignment.builder()
                .classId(classId).categoryId(categoryId).name("Midterm Exam")
                .maxPoints(BigDecimal.valueOf(100)).dueDate(LocalDate.of(2026, 6, 15))
                .isPublished(true).build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(gradeCategoryRepository.findByIdAndClassId(categoryId, classId)).thenReturn(Optional.of(category));
        when(assignmentRepository.save(any(Assignment.class))).thenReturn(saved);

        AssignmentResponse response = assignmentService.createAssignment(schoolId, classId, request);

        assertThat(response).isNotNull();
        assertThat(response.getName()).isEqualTo("Midterm Exam");
        assertThat(response.getMaxPoints()).isEqualByComparingTo(BigDecimal.valueOf(100));
        assertThat(response.getIsPublished()).isTrue();

        verify(assignmentRepository).save(any(Assignment.class));
    }

    @Test
    @DisplayName("createAssignment defaults isPublished to true when null")
    void createAssignment_isPublishedDefaultsToTrue() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        GradeCategory category = GradeCategory.builder()
                .classId(classId).name("Tests").weight(BigDecimal.valueOf(60)).dropLowest(0).build();

        CreateAssignmentRequest request = CreateAssignmentRequest.builder()
                .categoryId(categoryId)
                .name("Pop Quiz")
                .maxPoints(BigDecimal.valueOf(20))
                .isPublished(null) // deliberately null
                .build();

        Assignment saved = Assignment.builder()
                .classId(classId).categoryId(categoryId).name("Pop Quiz")
                .maxPoints(BigDecimal.valueOf(20)).isPublished(true).build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(gradeCategoryRepository.findByIdAndClassId(categoryId, classId)).thenReturn(Optional.of(category));
        when(assignmentRepository.save(any(Assignment.class))).thenReturn(saved);

        AssignmentResponse response = assignmentService.createAssignment(schoolId, classId, request);

        assertThat(response.getIsPublished()).isTrue();
    }

    @Test
    @DisplayName("createAssignment_categoryNotInClass_throws throws IllegalArgumentException when category belongs to different class")
    void createAssignment_categoryNotInClass_throws() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        CreateAssignmentRequest request = CreateAssignmentRequest.builder()
                .categoryId(categoryId)
                .name("Midterm Exam")
                .maxPoints(BigDecimal.valueOf(100))
                .build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(gradeCategoryRepository.findByIdAndClassId(categoryId, classId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> assignmentService.createAssignment(schoolId, classId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Category does not belong to this class");
    }

    // ---- updateAssignment ----

    @Test
    @DisplayName("updateAssignment updates fields and returns updated response")
    void updateAssignment_success() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        Assignment existing = Assignment.builder()
                .classId(classId).categoryId(categoryId).name("Midterm")
                .maxPoints(BigDecimal.valueOf(100)).isPublished(true).build();

        UpdateAssignmentRequest request = UpdateAssignmentRequest.builder()
                .name("Final Exam")
                .maxPoints(BigDecimal.valueOf(150))
                .isPublished(false)
                .build();

        Assignment updated = Assignment.builder()
                .classId(classId).categoryId(categoryId).name("Final Exam")
                .maxPoints(BigDecimal.valueOf(150)).isPublished(false).build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.of(existing));
        when(assignmentRepository.save(any(Assignment.class))).thenReturn(updated);

        AssignmentResponse response = assignmentService.updateAssignment(schoolId, classId, assignmentId, request);

        assertThat(response).isNotNull();
        assertThat(response.getName()).isEqualTo("Final Exam");
        assertThat(response.getMaxPoints()).isEqualByComparingTo(BigDecimal.valueOf(150));
        assertThat(response.getIsPublished()).isFalse();
    }

    @Test
    @DisplayName("updateAssignment with all null fields returns unchanged assignment")
    void updateAssignment_allNullFields_noChanges() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        Assignment existing = Assignment.builder()
                .classId(classId).categoryId(categoryId).name("Midterm")
                .maxPoints(BigDecimal.valueOf(100)).isPublished(true).build();

        UpdateAssignmentRequest request = UpdateAssignmentRequest.builder().build(); // all null

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.of(existing));
        when(assignmentRepository.save(any(Assignment.class))).thenReturn(existing);

        AssignmentResponse response = assignmentService.updateAssignment(schoolId, classId, assignmentId, request);

        assertThat(response.getName()).isEqualTo("Midterm");
        assertThat(response.getMaxPoints()).isEqualByComparingTo(BigDecimal.valueOf(100));
    }

    @Test
    @DisplayName("updateAssignment_categoryNotInClass_throws throws IllegalArgumentException when category belongs to different class")
    void updateAssignment_categoryNotInClass_throws() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID existingCategoryId = UUID.randomUUID();
        UUID newCategoryId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        Assignment existing = Assignment.builder()
                .classId(classId).categoryId(existingCategoryId).name("Midterm")
                .maxPoints(BigDecimal.valueOf(100)).isPublished(true).build();

        UpdateAssignmentRequest request = UpdateAssignmentRequest.builder()
                .categoryId(newCategoryId)
                .build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.of(existing));
        when(gradeCategoryRepository.findByIdAndClassId(newCategoryId, classId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> assignmentService.updateAssignment(schoolId, classId, assignmentId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Category does not belong to this class");
    }

    @Test
    @DisplayName("updateAssignment throws ResourceNotFoundException when assignment not found")
    void updateAssignment_notFound_throws() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.empty());

        UpdateAssignmentRequest request = UpdateAssignmentRequest.builder().name("New Name").build();

        assertThatThrownBy(() -> assignmentService.updateAssignment(schoolId, classId, assignmentId, request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---- deleteAssignment ----

    @Test
    @DisplayName("deleteAssignment calls repository delete on success")
    void deleteAssignment_success() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        Assignment assignment = Assignment.builder()
                .classId(classId).categoryId(categoryId).name("Quiz 1")
                .maxPoints(BigDecimal.valueOf(50)).isPublished(true).build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.of(assignment));

        assignmentService.deleteAssignment(schoolId, classId, assignmentId);

        verify(assignmentRepository).delete(assignment);
    }

    @Test
    @DisplayName("deleteAssignment throws ResourceNotFoundException when assignment not found")
    void deleteAssignment_notFound_throws() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> assignmentService.deleteAssignment(schoolId, classId, assignmentId))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
