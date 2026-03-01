package com.tracegrade.gradebook;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tracegrade.domain.model.Assignment;
import com.tracegrade.domain.model.Class;
import com.tracegrade.domain.model.ClassEnrollment;
import com.tracegrade.domain.model.Grade;
import com.tracegrade.domain.model.GradeCategory;
import com.tracegrade.domain.model.GradeStatus;
import com.tracegrade.domain.model.Student;
import com.tracegrade.domain.repository.AssignmentRepository;
import com.tracegrade.domain.repository.ClassEnrollmentRepository;
import com.tracegrade.domain.repository.ClassRepository;
import com.tracegrade.domain.repository.GradeCategoryRepository;
import com.tracegrade.domain.repository.GradeRepository;
import com.tracegrade.domain.repository.StudentRepository;
import com.tracegrade.dto.response.GradebookCellResponse;
import com.tracegrade.dto.response.GradebookColumnResponse;
import com.tracegrade.dto.response.GradebookResponse;
import com.tracegrade.dto.response.GradebookStudentRowResponse;
import com.tracegrade.exception.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class GradebookService {

    private static final int AVERAGE_SCALE = 2;

    private final ClassRepository classRepository;
    private final ClassEnrollmentRepository enrollmentRepository;
    private final AssignmentRepository assignmentRepository;
    private final GradeCategoryRepository categoryRepository;
    private final GradeRepository gradeRepository;
    private final StudentRepository studentRepository;

    @Transactional(readOnly = true)
    public GradebookResponse getGradebook(UUID schoolId, UUID classId) {
        Class cls = classRepository.findByIdAndSchoolId(classId, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Class", classId));

        log.info("Building gradebook for class {} (school {})", classId, schoolId);

        // Fetch assignments (published only) and their categories
        List<Assignment> assignments = assignmentRepository.findByClassIdAndIsPublished(classId, true);
        List<UUID> assignmentIds = assignments.stream().map(Assignment::getId).toList();

        Map<UUID, GradeCategory> categoriesById = categoryRepository.findByClassId(classId)
                .stream().collect(Collectors.toMap(GradeCategory::getId, Function.identity()));

        // Build ordered columns
        List<GradebookColumnResponse> columns = assignments.stream()
                .map(a -> toColumn(a, categoriesById.get(a.getCategoryId())))
                .toList();

        // Fetch active enrollments and their students
        List<ClassEnrollment> enrollments = enrollmentRepository.findByClassIdAndDroppedAtIsNull(classId);
        if (enrollments.isEmpty()) {
            return buildResponse(cls, columns, List.of());
        }

        List<UUID> studentIds = enrollments.stream().map(ClassEnrollment::getStudentId).toList();
        Map<UUID, Student> studentsById = studentRepository.findAllById(studentIds)
                .stream().collect(Collectors.toMap(Student::getId, Function.identity()));

        // Fetch all grades for all assignments in one query (avoid N+1)
        Map<UUID, Map<UUID, Grade>> gradesByStudentByAssignment = gradeRepository
                .findByAssignmentIdIn(assignmentIds)
                .stream()
                .collect(Collectors.groupingBy(
                        Grade::getStudentId,
                        Collectors.toMap(Grade::getAssignmentId, Function.identity())));

        // Build rows
        List<GradebookStudentRowResponse> rows = studentIds.stream()
                .map(studentId -> buildRow(
                        studentId,
                        studentsById.get(studentId),
                        assignments,
                        gradesByStudentByAssignment.getOrDefault(studentId, Map.of()),
                        categoriesById))
                .toList();

        return buildResponse(cls, columns, rows);
    }

    // ---- helpers ----

    private GradebookResponse buildResponse(Class cls, List<GradebookColumnResponse> columns,
            List<GradebookStudentRowResponse> rows) {
        return GradebookResponse.builder()
                .classId(cls.getId())
                .classLabel(buildClassLabel(cls))
                .columns(columns)
                .rows(rows)
                .build();
    }

    private String buildClassLabel(Class cls) {
        if (cls.getPeriod() != null && !cls.getPeriod().isBlank()) {
            return cls.getName() + " " + cls.getPeriod();
        }
        return cls.getName();
    }

    private GradebookColumnResponse toColumn(Assignment assignment, GradeCategory category) {
        return GradebookColumnResponse.builder()
                .id(assignment.getId())
                .label(assignment.getName())
                .categoryLabel(category != null ? category.getName() : null)
                .maxPoints(assignment.getMaxPoints())
                .build();
    }

    private GradebookStudentRowResponse buildRow(UUID studentId, Student student,
            List<Assignment> assignments, Map<UUID, Grade> gradeByAssignment,
            Map<UUID, GradeCategory> categoriesById) {

        List<GradebookCellResponse> cells = new ArrayList<>(assignments.size());
        for (Assignment assignment : assignments) {
            Grade grade = gradeByAssignment.get(assignment.getId());
            cells.add(toCell(assignment.getId(), grade));
        }

        BigDecimal average = computeWeightedAverage(assignments, gradeByAssignment, categoriesById);

        String studentName = student != null
                ? student.getFirstName() + " " + student.getLastName()
                : "Unknown Student";

        return GradebookStudentRowResponse.builder()
                .studentId(studentId)
                .studentName(studentName)
                .cells(cells)
                .average(average)
                .build();
    }

    private GradebookCellResponse toCell(UUID assignmentId, Grade grade) {
        if (grade == null) {
            return GradebookCellResponse.builder()
                    .columnId(assignmentId)
                    .pointsEarned(null)
                    .status(null)
                    .build();
        }
        return GradebookCellResponse.builder()
                .columnId(assignmentId)
                .pointsEarned(grade.getPointsEarned())
                .status(grade.getStatus())
                .build();
    }

    /**
     * Computes a category-weighted average percentage for one student.
     * Only GRADED assignments with non-null pointsEarned contribute.
     * Returns null when the student has no countable grades.
     */
    private BigDecimal computeWeightedAverage(List<Assignment> assignments,
            Map<UUID, Grade> gradeByAssignment, Map<UUID, GradeCategory> categoriesById) {

        // Group assignments by category; accumulate earned/possible per category
        Map<UUID, BigDecimal[]> earnedPossibleByCategory = new java.util.HashMap<>();
        for (Assignment assignment : assignments) {
            Grade grade = gradeByAssignment.get(assignment.getId());
            if (grade == null || grade.getStatus() != GradeStatus.GRADED
                    || grade.getPointsEarned() == null) {
                continue;
            }
            earnedPossibleByCategory.compute(assignment.getCategoryId(), (catId, acc) -> {
                if (acc == null) acc = new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO};
                acc[0] = acc[0].add(grade.getPointsEarned());
                acc[1] = acc[1].add(assignment.getMaxPoints());
                return acc;
            });
        }

        if (earnedPossibleByCategory.isEmpty()) {
            return null;
        }

        BigDecimal totalWeight = BigDecimal.ZERO;
        BigDecimal weightedSum = BigDecimal.ZERO;

        for (Map.Entry<UUID, BigDecimal[]> entry : earnedPossibleByCategory.entrySet()) {
            GradeCategory category = categoriesById.get(entry.getKey());
            if (category == null) continue;

            BigDecimal[] earnedPossible = entry.getValue();
            if (earnedPossible[1].compareTo(BigDecimal.ZERO) == 0) continue;

            BigDecimal categoryPct = earnedPossible[0]
                    .divide(earnedPossible[1], 10, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));

            weightedSum = weightedSum.add(categoryPct.multiply(category.getWeight()));
            totalWeight = totalWeight.add(category.getWeight());
        }

        if (totalWeight.compareTo(BigDecimal.ZERO) == 0) {
            return null;
        }

        return weightedSum.divide(totalWeight, AVERAGE_SCALE, RoundingMode.HALF_UP);
    }
}
