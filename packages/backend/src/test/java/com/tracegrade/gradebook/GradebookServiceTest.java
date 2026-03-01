package com.tracegrade.gradebook;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyList;
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

import com.tracegrade.domain.model.Assignment;
import com.tracegrade.domain.model.Class;
import com.tracegrade.domain.model.ClassEnrollment;
import com.tracegrade.domain.model.Grade;
import com.tracegrade.domain.model.GradeCategory;
import com.tracegrade.domain.model.GradeStatus;
import com.tracegrade.domain.model.School;
import com.tracegrade.domain.model.Student;
import com.tracegrade.domain.repository.AssignmentRepository;
import com.tracegrade.domain.repository.ClassEnrollmentRepository;
import com.tracegrade.domain.repository.ClassRepository;
import com.tracegrade.domain.repository.GradeCategoryRepository;
import com.tracegrade.domain.repository.GradeRepository;
import com.tracegrade.domain.repository.StudentRepository;
import com.tracegrade.dto.response.GradebookResponse;
import com.tracegrade.exception.ResourceNotFoundException;

@ExtendWith(MockitoExtension.class)
class GradebookServiceTest {

    @Mock private ClassRepository classRepository;
    @Mock private ClassEnrollmentRepository enrollmentRepository;
    @Mock private AssignmentRepository assignmentRepository;
    @Mock private GradeCategoryRepository categoryRepository;
    @Mock private GradeRepository gradeRepository;
    @Mock private StudentRepository studentRepository;

    @InjectMocks
    private GradebookService gradebookService;

    // ---- getGradebook ----

    @Test
    @DisplayName("getGradebook returns 404 when class not found")
    void getGradebook_classNotFound_throws() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> gradebookService.getGradebook(schoolId, classId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("getGradebook returns empty rows when class has no enrollments")
    void getGradebook_noEnrollments_returnsEmptyRows() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByClassIdAndIsPublished(classId, true)).thenReturn(List.of());
        when(categoryRepository.findByClassId(classId)).thenReturn(List.of());
        when(enrollmentRepository.findByClassIdAndDroppedAtIsNull(classId)).thenReturn(List.of());

        GradebookResponse result = gradebookService.getGradebook(schoolId, classId);

        assertThat(result.getRows()).isEmpty();
        assertThat(result.getColumns()).isEmpty();
    }

    @Test
    @DisplayName("getGradebook returns columns with category labels")
    void getGradebook_withAssignments_returnsColumns() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").period("Period 1").schoolYear("2026").build();

        GradeCategory category = GradeCategory.builder()
                .classId(classId).name("Tests").weight(BigDecimal.valueOf(100)).dropLowest(0).build();
        setId(category, categoryId);

        Assignment assignment = Assignment.builder()
                .classId(classId).categoryId(categoryId).name("Quiz 1")
                .maxPoints(BigDecimal.valueOf(50)).isPublished(true).build();
        setId(assignment, assignmentId);

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByClassIdAndIsPublished(classId, true)).thenReturn(List.of(assignment));
        when(categoryRepository.findByClassId(classId)).thenReturn(List.of(category));
        when(enrollmentRepository.findByClassIdAndDroppedAtIsNull(classId)).thenReturn(List.of());

        GradebookResponse result = gradebookService.getGradebook(schoolId, classId);

        assertThat(result.getClassLabel()).isEqualTo("Math Period 1");
        assertThat(result.getColumns()).hasSize(1);
        assertThat(result.getColumns().get(0).getLabel()).isEqualTo("Quiz 1");
        assertThat(result.getColumns().get(0).getCategoryLabel()).isEqualTo("Tests");
        assertThat(result.getColumns().get(0).getMaxPoints()).isEqualByComparingTo(BigDecimal.valueOf(50));
    }

    @Test
    @DisplayName("getGradebook returns student rows with cells and weighted average")
    void getGradebook_withGrades_returnsRowsWithAverage() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        GradeCategory category = GradeCategory.builder()
                .classId(classId).name("Tests").weight(BigDecimal.valueOf(100)).dropLowest(0).build();
        setId(category, categoryId);

        Assignment assignment = Assignment.builder()
                .classId(classId).categoryId(categoryId).name("Quiz 1")
                .maxPoints(BigDecimal.valueOf(100)).isPublished(true).build();
        setId(assignment, assignmentId);

        ClassEnrollment enrollment = ClassEnrollment.builder()
                .classId(classId).studentId(studentId).enrolledAt(java.time.Instant.now()).build();
        setId(enrollment, enrollmentId);

        Student student = Student.builder()
                .school(school).firstName("Jane").lastName("Doe")
                .email("jane@test.com").isActive(true).build();
        setId(student, studentId);

        Grade grade = Grade.builder()
                .assignmentId(assignmentId).studentId(studentId)
                .pointsEarned(BigDecimal.valueOf(85)).status(GradeStatus.GRADED).build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByClassIdAndIsPublished(classId, true)).thenReturn(List.of(assignment));
        when(categoryRepository.findByClassId(classId)).thenReturn(List.of(category));
        when(enrollmentRepository.findByClassIdAndDroppedAtIsNull(classId)).thenReturn(List.of(enrollment));
        when(studentRepository.findAllById(anyList())).thenReturn(List.of(student));
        when(gradeRepository.findByAssignmentIdIn(anyCollection())).thenReturn(List.of(grade));

        GradebookResponse result = gradebookService.getGradebook(schoolId, classId);

        assertThat(result.getRows()).hasSize(1);
        var row = result.getRows().get(0);
        assertThat(row.getStudentName()).isEqualTo("Jane Doe");
        assertThat(row.getCells()).hasSize(1);
        assertThat(row.getCells().get(0).getPointsEarned()).isEqualByComparingTo(BigDecimal.valueOf(85));
        assertThat(row.getCells().get(0).getStatus()).isEqualTo(GradeStatus.GRADED);
        assertThat(row.getAverage()).isEqualByComparingTo(BigDecimal.valueOf(85));
    }

    @Test
    @DisplayName("getGradebook returns null average when student has no graded assignments")
    void getGradebook_noGrades_nullAverage() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Science").schoolYear("2026").build();

        GradeCategory category = GradeCategory.builder()
                .classId(classId).name("Labs").weight(BigDecimal.valueOf(50)).dropLowest(0).build();
        setId(category, categoryId);

        Assignment assignment = Assignment.builder()
                .classId(classId).categoryId(categoryId).name("Lab 1")
                .maxPoints(BigDecimal.valueOf(20)).isPublished(true).build();
        setId(assignment, assignmentId);

        ClassEnrollment enrollment = ClassEnrollment.builder()
                .classId(classId).studentId(studentId).enrolledAt(java.time.Instant.now()).build();

        Student student = Student.builder()
                .school(school).firstName("Bob").lastName("Smith")
                .email("bob@test.com").isActive(true).build();
        setId(student, studentId);

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByClassIdAndIsPublished(classId, true)).thenReturn(List.of(assignment));
        when(categoryRepository.findByClassId(classId)).thenReturn(List.of(category));
        when(enrollmentRepository.findByClassIdAndDroppedAtIsNull(classId)).thenReturn(List.of(enrollment));
        when(studentRepository.findAllById(anyList())).thenReturn(List.of(student));
        when(gradeRepository.findByAssignmentIdIn(anyCollection())).thenReturn(List.of());

        GradebookResponse result = gradebookService.getGradebook(schoolId, classId);

        assertThat(result.getRows()).hasSize(1);
        assertThat(result.getRows().get(0).getAverage()).isNull();
        assertThat(result.getRows().get(0).getCells().get(0).getPointsEarned()).isNull();
        assertThat(result.getRows().get(0).getCells().get(0).getStatus()).isNull();
    }

    @Test
    @DisplayName("getGradebook class label omits period when period is null")
    void getGradebook_noPeriod_classLabelIsName() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("History").period(null).schoolYear("2026").build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByClassIdAndIsPublished(classId, true)).thenReturn(List.of());
        when(categoryRepository.findByClassId(classId)).thenReturn(List.of());
        when(enrollmentRepository.findByClassIdAndDroppedAtIsNull(classId)).thenReturn(List.of());

        GradebookResponse result = gradebookService.getGradebook(schoolId, classId);

        assertThat(result.getClassLabel()).isEqualTo("History");
    }

    // ---- helper: reflectively set UUID id on BaseEntity subclasses ----

    private static void setId(Object entity, UUID id) {
        try {
            var field = com.tracegrade.domain.model.BaseEntity.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
