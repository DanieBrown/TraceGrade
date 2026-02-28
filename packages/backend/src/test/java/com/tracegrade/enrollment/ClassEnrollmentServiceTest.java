package com.tracegrade.enrollment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.tracegrade.domain.model.Class;
import com.tracegrade.domain.model.ClassEnrollment;
import com.tracegrade.domain.model.School;
import com.tracegrade.domain.model.Student;
import com.tracegrade.domain.repository.ClassEnrollmentRepository;
import com.tracegrade.domain.repository.ClassRepository;
import com.tracegrade.domain.repository.StudentRepository;
import com.tracegrade.dto.response.EnrollmentResponse;
import com.tracegrade.exception.DuplicateResourceException;
import com.tracegrade.exception.ResourceNotFoundException;

@ExtendWith(MockitoExtension.class)
class ClassEnrollmentServiceTest {

    @Mock
    private ClassEnrollmentRepository enrollmentRepository;

    @Mock
    private ClassRepository classRepository;

    @Mock
    private StudentRepository studentRepository;

    @InjectMocks
    private ClassEnrollmentService enrollmentService;

    // ---- enrollStudent ----

    @Test
    @DisplayName("enrollStudent returns EnrollmentResponse on success")
    void enrollStudent_success() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();
        Student student = new Student();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(studentRepository.findByIdAndSchoolId(studentId, schoolId)).thenReturn(Optional.of(student));
        when(enrollmentRepository.existsByClassIdAndStudentIdAndDroppedAtIsNull(classId, studentId)).thenReturn(false);

        ClassEnrollment saved = ClassEnrollment.builder()
                .classId(classId)
                .studentId(studentId)
                .enrolledAt(Instant.now())
                .build();
        when(enrollmentRepository.save(any(ClassEnrollment.class))).thenReturn(saved);

        EnrollmentResponse response = enrollmentService.enrollStudent(schoolId, classId, studentId);

        assertThat(response).isNotNull();
        assertThat(response.getClassId()).isEqualTo(classId);
        assertThat(response.getStudentId()).isEqualTo(studentId);
        assertThat(response.getEnrolledAt()).isNotNull();
        assertThat(response.getDroppedAt()).isNull();

        verify(enrollmentRepository).save(any(ClassEnrollment.class));
    }

    @Test
    @DisplayName("enrollStudent throws DuplicateResourceException when student already actively enrolled")
    void enrollStudent_duplicateEnrollment_throws409() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();
        Student student = new Student();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(studentRepository.findByIdAndSchoolId(studentId, schoolId)).thenReturn(Optional.of(student));
        when(enrollmentRepository.existsByClassIdAndStudentIdAndDroppedAtIsNull(classId, studentId)).thenReturn(true);

        assertThatThrownBy(() -> enrollmentService.enrollStudent(schoolId, classId, studentId))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    @DisplayName("enrollStudent throws ResourceNotFoundException when class does not belong to school")
    void enrollStudent_classNotInSchool_throws404() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> enrollmentService.enrollStudent(schoolId, classId, studentId))
                .isInstanceOf(ResourceNotFoundException.class);

        verifyNoInteractions(studentRepository, enrollmentRepository);
    }

    @Test
    @DisplayName("enrollStudent throws ResourceNotFoundException when student does not exist")
    void enrollStudent_studentNotFound_throws404() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(studentRepository.findByIdAndSchoolId(studentId, schoolId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> enrollmentService.enrollStudent(schoolId, classId, studentId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("enrollStudent throws ResourceNotFoundException when student does not belong to the school")
    void enrollStudent_studentNotInSchool_throws404() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(studentRepository.findByIdAndSchoolId(studentId, schoolId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> enrollmentService.enrollStudent(schoolId, classId, studentId))
                .isInstanceOf(ResourceNotFoundException.class);

        verifyNoInteractions(enrollmentRepository);
    }

    @Test
    @DisplayName("listEnrollments returns active enrollments for the class")
    void listEnrollments_returnsActiveEnrollments() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        UUID studentId1 = UUID.randomUUID();
        UUID studentId2 = UUID.randomUUID();

        ClassEnrollment e1 = ClassEnrollment.builder()
                .classId(classId).studentId(studentId1).enrolledAt(Instant.now()).build();
        ClassEnrollment e2 = ClassEnrollment.builder()
                .classId(classId).studentId(studentId2).enrolledAt(Instant.now()).build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(enrollmentRepository.findByClassIdAndDroppedAtIsNull(classId)).thenReturn(List.of(e1, e2));

        List<EnrollmentResponse> result = enrollmentService.listEnrollments(schoolId, classId);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getStudentId()).isEqualTo(studentId1);
        assertThat(result.get(1).getStudentId()).isEqualTo(studentId2);
    }

    @Test
    @DisplayName("listEnrollments throws 404 when class does not belong to school")
    void listEnrollments_classNotInSchool_throws404() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> enrollmentService.listEnrollments(schoolId, classId));
        verifyNoInteractions(enrollmentRepository);
    }

    // ---- dropStudent ----

    @Test
    @DisplayName("dropStudent sets droppedAt and saves on success")
    void dropStudent_success() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        ClassEnrollment enrollment = ClassEnrollment.builder()
                .classId(classId)
                .studentId(UUID.randomUUID())
                .enrolledAt(Instant.now())
                .build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(enrollmentRepository.findByIdAndClassId(enrollmentId, classId)).thenReturn(Optional.of(enrollment));
        when(enrollmentRepository.save(any(ClassEnrollment.class))).thenReturn(enrollment);

        enrollmentService.dropStudent(schoolId, classId, enrollmentId);

        assertThat(enrollment.getDroppedAt()).isNotNull();
        verify(enrollmentRepository).save(enrollment);
    }

    @Test
    @DisplayName("dropStudent throws ResourceNotFoundException when enrollment not found")
    void dropStudent_enrollmentNotFound_throws404() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(enrollmentRepository.findByIdAndClassId(enrollmentId, classId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> enrollmentService.dropStudent(schoolId, classId, enrollmentId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("dropStudent throws ResourceNotFoundException when enrollment already dropped")
    void dropStudent_alreadyDropped_throws404() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();

        School school = new School();
        Class cls = Class.builder().school(school).teacherId(UUID.randomUUID())
                .name("Math").schoolYear("2026").build();

        ClassEnrollment alreadyDropped = ClassEnrollment.builder()
                .classId(classId)
                .studentId(UUID.randomUUID())
                .enrolledAt(Instant.now().minusSeconds(3600))
                .droppedAt(Instant.now().minusSeconds(1800))
                .build();

        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.of(cls));
        when(enrollmentRepository.findByIdAndClassId(enrollmentId, classId)).thenReturn(Optional.of(alreadyDropped));

        assertThatThrownBy(() -> enrollmentService.dropStudent(schoolId, classId, enrollmentId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("dropStudent throws 404 when class does not belong to school")
    void dropStudent_classNotInSchool_throws404() {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID enrollmentId = UUID.randomUUID();
        when(classRepository.findByIdAndSchoolId(classId, schoolId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> enrollmentService.dropStudent(schoolId, classId, enrollmentId));
        verifyNoInteractions(enrollmentRepository);
    }
}
