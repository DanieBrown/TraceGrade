package com.tracegrade.domain.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import com.tracegrade.domain.model.Class;
import com.tracegrade.domain.model.School;
import com.tracegrade.domain.model.SchoolType;

@DataJpaTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class ClassRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private ClassRepository classRepository;

    private School createAndPersistSchool(String name) {
        School school = School.builder()
                .name(name)
                .schoolType(SchoolType.HIGH)
                .build();
        return entityManager.persistAndFlush(school);
    }

    private UUID createAndPersistTeacher(School school, String email) {
        UUID teacherId = UUID.randomUUID();
        Instant now = Instant.now();
        entityManager.getEntityManager().createNativeQuery("""
                INSERT INTO users (id, school_id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
                VALUES (:id, :schoolId, :email, :passwordHash, :firstName, :lastName, :role, :isActive, :createdAt, :updatedAt)
                """)
                .setParameter("id", teacherId)
                .setParameter("schoolId", school.getId())
                .setParameter("email", email)
                .setParameter("passwordHash", "hash")
                .setParameter("firstName", "Teacher")
                .setParameter("lastName", "One")
                .setParameter("role", "TEACHER")
                .setParameter("isActive", true)
                .setParameter("createdAt", now)
                .setParameter("updatedAt", now)
                .executeUpdate();
        return teacherId;
    }

    private Class createAndPersistClass(School school, UUID teacherId, String name, String schoolYear, String period,
            boolean isActive) {
        Class classEntity = Class.builder()
                .school(school)
                .teacherId(teacherId)
                .name(name)
                .subject("Math")
                .period(period)
                .schoolYear(schoolYear)
                .gradingScale("A-F")
                .isActive(isActive)
                .build();
        return entityManager.persistAndFlush(classEntity);
    }

    @Test
    @DisplayName("Should find active classes by school ID")
    void shouldFindActiveClassesBySchoolId() {
        School schoolOne = createAndPersistSchool("School One");
        School schoolTwo = createAndPersistSchool("School Two");
        UUID teacherOne = createAndPersistTeacher(schoolOne, "teacher1@test.com");
        UUID teacherTwo = createAndPersistTeacher(schoolTwo, "teacher2@test.com");

        createAndPersistClass(schoolOne, teacherOne, "Algebra I", "2025-2026", "P1", true);
        createAndPersistClass(schoolOne, teacherOne, "Geometry", "2025-2026", "P2", false);
        createAndPersistClass(schoolTwo, teacherTwo, "Biology", "2025-2026", "P1", true);

        List<Class> classes = classRepository.findBySchoolIdAndIsActiveTrue(schoolOne.getId());

        assertThat(classes).hasSize(1);
        assertThat(classes.get(0).getName()).isEqualTo("Algebra I");
    }

    @Test
    @DisplayName("Should find class by ID and school ID")
    void shouldFindClassByIdAndSchoolId() {
        School school = createAndPersistSchool("Scoped School");
        School otherSchool = createAndPersistSchool("Other School");
        UUID teacher = createAndPersistTeacher(school, "teacher3@test.com");

        Class classEntity = createAndPersistClass(school, teacher, "Chemistry", "2025-2026", "P3", true);

        Optional<Class> found = classRepository.findByIdAndSchoolId(classEntity.getId(), school.getId());
        Optional<Class> notFound = classRepository.findByIdAndSchoolId(classEntity.getId(), otherSchool.getId());

        assertThat(found).isPresent();
        assertThat(notFound).isNotPresent();
    }

    @Test
    @DisplayName("Should support duplicate checks for active classes")
    void shouldSupportDuplicateChecksForActiveClasses() {
        School school = createAndPersistSchool("Duplicate School");
        UUID teacher = createAndPersistTeacher(school, "teacher4@test.com");

        createAndPersistClass(school, teacher, "World History", "2025-2026", "P4", true);

        boolean duplicateExists = classRepository
                .existsBySchoolIdAndTeacherIdAndNameIgnoreCaseAndSchoolYearAndPeriodAndIsActiveTrue(
                        school.getId(), teacher, "world history", "2025-2026", "P4");

        assertThat(duplicateExists).isTrue();
    }

    @Test
    @DisplayName("Should exclude same class ID when checking duplicate on update")
    void shouldExcludeSameClassIdWhenCheckingDuplicateOnUpdate() {
        School school = createAndPersistSchool("Update Duplicate School");
        UUID teacher = createAndPersistTeacher(school, "teacher5@test.com");

        Class classEntity = createAndPersistClass(school, teacher, "Physics", "2025-2026", "P5", true);
        Class otherClass = createAndPersistClass(school, teacher, "Physics", "2025-2026", "P5", false);

        boolean duplicateForSameId = classRepository
                .existsBySchoolIdAndTeacherIdAndNameIgnoreCaseAndSchoolYearAndPeriodAndIsActiveTrueAndIdNot(
                        school.getId(), teacher, "physics", "2025-2026", "P5", classEntity.getId());

        boolean duplicateForOtherId = classRepository
                .existsBySchoolIdAndTeacherIdAndNameIgnoreCaseAndSchoolYearAndPeriodAndIsActiveTrueAndIdNot(
                        school.getId(), teacher, "physics", "2025-2026", "P5", otherClass.getId());

        assertThat(duplicateForSameId).isFalse();
        assertThat(duplicateForOtherId).isTrue();
    }
}