package com.tracegrade.domain.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import com.tracegrade.domain.model.School;
import com.tracegrade.domain.model.SchoolType;
import com.tracegrade.domain.model.Student;

@DataJpaTest
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class StudentRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private StudentRepository studentRepository;

    private School createAndPersistSchool() {
        School school = School.builder()
                .name("Test School")
            .schoolType(SchoolType.HIGH)
                .build();
        return entityManager.persistAndFlush(school);
    }

    private Student createAndPersistStudent(School school, String email, boolean isActive) {
        Student student = Student.builder()
                .school(school)
                .firstName("John")
                .lastName("Doe")
                .email(email)
                .isActive(isActive)
                .build();
        return entityManager.persistAndFlush(student);
    }

    @Test
    @DisplayName("Should count active students by school ID")
    void shouldCountActiveStudentsBySchoolId() {
        School school1 = createAndPersistSchool();
        School school2 = createAndPersistSchool();

        createAndPersistStudent(school1, "active1@test.com", true);
        createAndPersistStudent(school1, "active2@test.com", true);
        createAndPersistStudent(school1, "inactive@test.com", false);
        createAndPersistStudent(school2, "active3@test.com", true);

        long count = studentRepository.countBySchoolIdAndIsActiveTrue(school1.getId());

        assertThat(count).isEqualTo(2);
    }

    @Test
    @DisplayName("Should find active students by school ID")
    void shouldFindActiveStudentsBySchoolId() {
        School school = createAndPersistSchool();

        createAndPersistStudent(school, "active1@test.com", true);
        createAndPersistStudent(school, "inactive@test.com", false);

        List<Student> students = studentRepository.findBySchoolIdAndIsActiveTrue(school.getId());

        assertThat(students).hasSize(1);
        assertThat(students.get(0).getEmail()).isEqualTo("active1@test.com");
    }
}
