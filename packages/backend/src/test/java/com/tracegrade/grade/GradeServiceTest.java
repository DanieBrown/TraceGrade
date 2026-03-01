package com.tracegrade.grade;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
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

@ExtendWith(MockitoExtension.class)
class GradeServiceTest {

    @Mock
    private GradeRepository gradeRepository;

    @Mock
    private ClassRepository classRepository;

    @Mock
    private AssignmentRepository assignmentRepository;

    @InjectMocks
    private GradeService gradeService;

    // ---- createGrade ----

    @Test
    @DisplayName("createGrade returns GradeResponse on success")
    void createGrade_success() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        com.tracegrade.domain.model.Class cls = com.tracegrade.domain.model.Class.builder()
                .school(new com.tracegrade.domain.model.School())
                .teacherId(UUID.randomUUID()).name("Math").schoolYear("2026").build();
        Assignment assignment = Assignment.builder().classId(classId).name("HW1").build();

        CreateGradeRequest request = CreateGradeRequest.builder()
                .studentId(studentId)
                .pointsEarned(BigDecimal.valueOf(85))
                .status(GradeStatus.GRADED)
                .gradedAt(Instant.now())
                .build();

        Grade saved = Grade.builder()
                .assignmentId(assignmentId)
                .studentId(studentId)
                .pointsEarned(BigDecimal.valueOf(85))
                .status(GradeStatus.GRADED)
                .build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.of(assignment));
        when(gradeRepository.existsByStudentIdAndAssignmentId(studentId, assignmentId)).thenReturn(false);
        when(gradeRepository.save(any(Grade.class))).thenReturn(saved);

        GradeResponse response = gradeService.createGrade(schoolId, classId, assignmentId, request);

        assertThat(response).isNotNull();
        assertThat(response.getStudentId()).isEqualTo(studentId);
        assertThat(response.getStatus()).isEqualTo(GradeStatus.GRADED);
        verify(gradeRepository).save(any(Grade.class));
    }

    @Test
    @DisplayName("createGrade throws DuplicateResourceException when (student, assignment) already exists")
    void createGrade_duplicate() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        com.tracegrade.domain.model.Class cls = com.tracegrade.domain.model.Class.builder()
                .school(new com.tracegrade.domain.model.School())
                .teacherId(UUID.randomUUID()).name("Math").schoolYear("2026").build();
        Assignment assignment = Assignment.builder().classId(classId).name("HW1").build();

        CreateGradeRequest request = CreateGradeRequest.builder()
                .studentId(studentId).status(GradeStatus.PENDING).build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.of(assignment));
        when(gradeRepository.existsByStudentIdAndAssignmentId(studentId, assignmentId)).thenReturn(true);

        assertThatThrownBy(() -> gradeService.createGrade(schoolId, classId, assignmentId, request))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    @DisplayName("createGrade throws ResourceNotFoundException when assignment not found")
    void createGrade_assignmentNotFound() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        com.tracegrade.domain.model.Class cls = com.tracegrade.domain.model.Class.builder()
                .school(new com.tracegrade.domain.model.School())
                .teacherId(UUID.randomUUID()).name("Math").schoolYear("2026").build();

        CreateGradeRequest request = CreateGradeRequest.builder()
                .studentId(UUID.randomUUID()).status(GradeStatus.PENDING).build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> gradeService.createGrade(schoolId, classId, assignmentId, request))
                .isInstanceOf(ResourceNotFoundException.class);

        verifyNoInteractions(gradeRepository);
    }

    @Test
    @DisplayName("createGrade throws ResourceNotFoundException when class not found")
    void createGrade_classNotFound() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.empty());

        CreateGradeRequest request = CreateGradeRequest.builder()
                .studentId(UUID.randomUUID()).status(GradeStatus.PENDING).build();

        assertThatThrownBy(() -> gradeService.createGrade(schoolId, classId, assignmentId, request))
                .isInstanceOf(ResourceNotFoundException.class);

        verifyNoInteractions(assignmentRepository);
        verifyNoInteractions(gradeRepository);
    }

    @Test
    @DisplayName("createGrade with EXCUSED status sets pointsEarned to null")
    void createGrade_excused_nullifiesPoints() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        com.tracegrade.domain.model.Class cls = com.tracegrade.domain.model.Class.builder()
                .school(new com.tracegrade.domain.model.School())
                .teacherId(UUID.randomUUID()).name("Math").schoolYear("2026").build();
        Assignment assignment = Assignment.builder().classId(classId).name("HW1").build();

        CreateGradeRequest request = CreateGradeRequest.builder()
                .studentId(studentId)
                .pointsEarned(BigDecimal.valueOf(90)) // should be nullified
                .status(GradeStatus.EXCUSED)
                .build();

        Grade saved = Grade.builder()
                .assignmentId(assignmentId)
                .studentId(studentId)
                .pointsEarned(null)
                .status(GradeStatus.EXCUSED)
                .build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.of(assignment));
        when(gradeRepository.existsByStudentIdAndAssignmentId(studentId, assignmentId)).thenReturn(false);
        when(gradeRepository.save(any(Grade.class))).thenReturn(saved);

        GradeResponse response = gradeService.createGrade(schoolId, classId, assignmentId, request);

        assertThat(response.getPointsEarned()).isNull();
        assertThat(response.getStatus()).isEqualTo(GradeStatus.EXCUSED);
    }

    // ---- bulkCreateGrades ----

    @Test
    @DisplayName("bulkCreateGrades returns list of GradeResponse on success")
    void bulkCreateGrades_success() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID studentId1 = UUID.randomUUID();
        UUID studentId2 = UUID.randomUUID();

        com.tracegrade.domain.model.Class cls = com.tracegrade.domain.model.Class.builder()
                .school(new com.tracegrade.domain.model.School())
                .teacherId(UUID.randomUUID()).name("Math").schoolYear("2026").build();
        Assignment assignment = Assignment.builder().classId(classId).name("HW1").build();

        BulkCreateGradesRequest request = new BulkCreateGradesRequest(List.of(
                CreateGradeRequest.builder().studentId(studentId1).status(GradeStatus.GRADED)
                        .pointsEarned(BigDecimal.valueOf(80)).build(),
                CreateGradeRequest.builder().studentId(studentId2).status(GradeStatus.GRADED)
                        .pointsEarned(BigDecimal.valueOf(90)).build()
        ));

        Grade grade1 = Grade.builder().assignmentId(assignmentId).studentId(studentId1)
                .pointsEarned(BigDecimal.valueOf(80)).status(GradeStatus.GRADED).build();
        Grade grade2 = Grade.builder().assignmentId(assignmentId).studentId(studentId2)
                .pointsEarned(BigDecimal.valueOf(90)).status(GradeStatus.GRADED).build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.of(assignment));
        when(gradeRepository.existsByStudentIdAndAssignmentId(studentId1, assignmentId)).thenReturn(false);
        when(gradeRepository.existsByStudentIdAndAssignmentId(studentId2, assignmentId)).thenReturn(false);
        when(gradeRepository.saveAll(anyList())).thenReturn(List.of(grade1, grade2));

        List<GradeResponse> responses = gradeService.bulkCreateGrades(schoolId, classId, assignmentId, request);

        assertThat(responses).hasSize(2);
        verify(gradeRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("bulkCreateGrades throws DuplicateResourceException if any student has existing grade")
    void bulkCreateGrades_duplicate() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID studentId1 = UUID.randomUUID();
        UUID studentId2 = UUID.randomUUID();

        com.tracegrade.domain.model.Class cls = com.tracegrade.domain.model.Class.builder()
                .school(new com.tracegrade.domain.model.School())
                .teacherId(UUID.randomUUID()).name("Math").schoolYear("2026").build();
        Assignment assignment = Assignment.builder().classId(classId).name("HW1").build();

        BulkCreateGradesRequest request = new BulkCreateGradesRequest(List.of(
                CreateGradeRequest.builder().studentId(studentId1).status(GradeStatus.GRADED).build(),
                CreateGradeRequest.builder().studentId(studentId2).status(GradeStatus.GRADED).build()
        ));

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.of(assignment));
        when(gradeRepository.existsByStudentIdAndAssignmentId(studentId1, assignmentId)).thenReturn(true);

        assertThatThrownBy(() -> gradeService.bulkCreateGrades(schoolId, classId, assignmentId, request))
                .isInstanceOf(DuplicateResourceException.class);
    }

    // ---- listGradesByAssignment ----

    @Test
    @DisplayName("listGradesByAssignment returns all grades for assignment")
    void listGradesByAssignment_success() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();

        com.tracegrade.domain.model.Class cls = com.tracegrade.domain.model.Class.builder()
                .school(new com.tracegrade.domain.model.School())
                .teacherId(UUID.randomUUID()).name("Math").schoolYear("2026").build();
        Assignment assignment = Assignment.builder().classId(classId).name("HW1").build();

        Grade grade1 = Grade.builder().assignmentId(assignmentId).studentId(UUID.randomUUID())
                .status(GradeStatus.GRADED).pointsEarned(BigDecimal.valueOf(80)).build();
        Grade grade2 = Grade.builder().assignmentId(assignmentId).studentId(UUID.randomUUID())
                .status(GradeStatus.PENDING).build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.of(assignment));
        when(gradeRepository.findByAssignmentId(assignmentId)).thenReturn(List.of(grade1, grade2));

        List<GradeResponse> responses = gradeService.listGradesByAssignment(schoolId, classId, assignmentId);

        assertThat(responses).hasSize(2);
    }

    // ---- getGrade ----

    @Test
    @DisplayName("getGrade returns GradeResponse on success")
    void getGrade_success() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID gradeId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        com.tracegrade.domain.model.Class cls = com.tracegrade.domain.model.Class.builder()
                .school(new com.tracegrade.domain.model.School())
                .teacherId(UUID.randomUUID()).name("Math").schoolYear("2026").build();
        Assignment assignment = Assignment.builder().classId(classId).name("HW1").build();

        Grade grade = Grade.builder().assignmentId(assignmentId).studentId(studentId)
                .status(GradeStatus.GRADED).pointsEarned(BigDecimal.valueOf(75)).build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.of(assignment));
        when(gradeRepository.findByIdAndAssignmentId(gradeId, assignmentId)).thenReturn(Optional.of(grade));

        GradeResponse response = gradeService.getGrade(schoolId, classId, assignmentId, gradeId);

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(GradeStatus.GRADED);
    }

    @Test
    @DisplayName("getGrade throws ResourceNotFoundException when grade not found")
    void getGrade_notFound() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID gradeId = UUID.randomUUID();

        com.tracegrade.domain.model.Class cls = com.tracegrade.domain.model.Class.builder()
                .school(new com.tracegrade.domain.model.School())
                .teacherId(UUID.randomUUID()).name("Math").schoolYear("2026").build();
        Assignment assignment = Assignment.builder().classId(classId).name("HW1").build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.of(assignment));
        when(gradeRepository.findByIdAndAssignmentId(gradeId, assignmentId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> gradeService.getGrade(schoolId, classId, assignmentId, gradeId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---- updateGrade ----

    @Test
    @DisplayName("updateGrade updates fields and returns updated response")
    void updateGrade_success() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID gradeId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        com.tracegrade.domain.model.Class cls = com.tracegrade.domain.model.Class.builder()
                .school(new com.tracegrade.domain.model.School())
                .teacherId(UUID.randomUUID()).name("Math").schoolYear("2026").build();
        Assignment assignment = Assignment.builder().classId(classId).name("HW1").build();

        Grade existing = Grade.builder().assignmentId(assignmentId).studentId(studentId)
                .status(GradeStatus.PENDING).build();

        UpdateGradeRequest request = UpdateGradeRequest.builder()
                .status(GradeStatus.GRADED)
                .pointsEarned(BigDecimal.valueOf(95))
                .notes("Excellent work")
                .build();

        Grade updated = Grade.builder().assignmentId(assignmentId).studentId(studentId)
                .status(GradeStatus.GRADED).pointsEarned(BigDecimal.valueOf(95)).notes("Excellent work").build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.of(assignment));
        when(gradeRepository.findByIdAndAssignmentId(gradeId, assignmentId)).thenReturn(Optional.of(existing));
        when(gradeRepository.save(any(Grade.class))).thenReturn(updated);

        GradeResponse response = gradeService.updateGrade(schoolId, classId, assignmentId, gradeId, request);

        assertThat(response.getStatus()).isEqualTo(GradeStatus.GRADED);
        assertThat(response.getPointsEarned()).isEqualByComparingTo(BigDecimal.valueOf(95));
        assertThat(response.getNotes()).isEqualTo("Excellent work");
    }

    @Test
    @DisplayName("updateGrade to EXCUSED sets pointsEarned to null")
    void updateGrade_toExcused_nullifiesPoints() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID gradeId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        com.tracegrade.domain.model.Class cls = com.tracegrade.domain.model.Class.builder()
                .school(new com.tracegrade.domain.model.School())
                .teacherId(UUID.randomUUID()).name("Math").schoolYear("2026").build();
        Assignment assignment = Assignment.builder().classId(classId).name("HW1").build();

        Grade existing = Grade.builder().assignmentId(assignmentId).studentId(studentId)
                .status(GradeStatus.GRADED).pointsEarned(BigDecimal.valueOf(80)).build();

        UpdateGradeRequest request = UpdateGradeRequest.builder()
                .status(GradeStatus.EXCUSED)
                .build();

        Grade updated = Grade.builder().assignmentId(assignmentId).studentId(studentId)
                .status(GradeStatus.EXCUSED).pointsEarned(null).build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.of(assignment));
        when(gradeRepository.findByIdAndAssignmentId(gradeId, assignmentId)).thenReturn(Optional.of(existing));
        when(gradeRepository.save(any(Grade.class))).thenReturn(updated);

        GradeResponse response = gradeService.updateGrade(schoolId, classId, assignmentId, gradeId, request);

        assertThat(response.getPointsEarned()).isNull();
        assertThat(response.getStatus()).isEqualTo(GradeStatus.EXCUSED);
    }

    @Test
    @DisplayName("updateGrade throws ResourceNotFoundException when grade not found")
    void updateGrade_notFound() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID gradeId = UUID.randomUUID();

        com.tracegrade.domain.model.Class cls = com.tracegrade.domain.model.Class.builder()
                .school(new com.tracegrade.domain.model.School())
                .teacherId(UUID.randomUUID()).name("Math").schoolYear("2026").build();
        Assignment assignment = Assignment.builder().classId(classId).name("HW1").build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.of(assignment));
        when(gradeRepository.findByIdAndAssignmentId(gradeId, assignmentId)).thenReturn(Optional.empty());

        UpdateGradeRequest request = UpdateGradeRequest.builder().status(GradeStatus.GRADED).build();

        assertThatThrownBy(() -> gradeService.updateGrade(schoolId, classId, assignmentId, gradeId, request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---- deleteGrade ----

    @Test
    @DisplayName("deleteGrade calls repository delete on success")
    void deleteGrade_success() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID gradeId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        com.tracegrade.domain.model.Class cls = com.tracegrade.domain.model.Class.builder()
                .school(new com.tracegrade.domain.model.School())
                .teacherId(UUID.randomUUID()).name("Math").schoolYear("2026").build();
        Assignment assignment = Assignment.builder().classId(classId).name("HW1").build();

        Grade grade = Grade.builder().assignmentId(assignmentId).studentId(studentId)
                .status(GradeStatus.GRADED).build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.of(assignment));
        when(gradeRepository.findByIdAndAssignmentId(gradeId, assignmentId)).thenReturn(Optional.of(grade));

        gradeService.deleteGrade(schoolId, classId, assignmentId, gradeId);

        verify(gradeRepository).delete(grade);
    }

    @Test
    @DisplayName("deleteGrade throws ResourceNotFoundException when grade not found")
    void deleteGrade_notFound() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID assignmentId = UUID.randomUUID();
        UUID gradeId = UUID.randomUUID();

        com.tracegrade.domain.model.Class cls = com.tracegrade.domain.model.Class.builder()
                .school(new com.tracegrade.domain.model.School())
                .teacherId(UUID.randomUUID()).name("Math").schoolYear("2026").build();
        Assignment assignment = Assignment.builder().classId(classId).name("HW1").build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(assignmentRepository.findByIdAndClassId(assignmentId, classId)).thenReturn(Optional.of(assignment));
        when(gradeRepository.findByIdAndAssignmentId(gradeId, assignmentId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> gradeService.deleteGrade(schoolId, classId, assignmentId, gradeId))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
