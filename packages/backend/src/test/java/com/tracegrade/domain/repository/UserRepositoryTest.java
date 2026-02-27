package com.tracegrade.domain.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import com.tracegrade.domain.model.User;
import com.tracegrade.domain.model.UserRole;

@DataJpaTest
@ActiveProfiles("test")
@org.springframework.test.context.TestPropertySource(properties = {
    "spring.flyway.enabled=false",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class UserRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("Should hydrate user when school_id is null")
    void shouldHydrateUserWhenSchoolIdIsNull() {
        UUID userId = UUID.randomUUID();
        Instant now = Instant.now();

        entityManager.getEntityManager().createNativeQuery("""
                INSERT INTO users (id, school_id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
                VALUES (:id, NULL, :email, :passwordHash, :firstName, :lastName, :role, :isActive, :createdAt, :updatedAt)
                """)
                .setParameter("id", userId)
                .setParameter("email", "null-school@test.com")
                .setParameter("passwordHash", "hash-null-school")
                .setParameter("firstName", "Null")
                .setParameter("lastName", "School")
                .setParameter("role", "TEACHER")
                .setParameter("isActive", true)
                .setParameter("createdAt", now)
                .setParameter("updatedAt", now)
                .executeUpdate();

        entityManager.clear();

        User found = userRepository.findById(userId).orElseThrow();

        assertThat(found.getSchool()).isNull();
        assertThat(found.getRole()).isEqualTo(UserRole.TEACHER);
        assertThat(found.getEmail()).isEqualTo("null-school@test.com");
    }

    @Test
    @DisplayName("Should persist and read all supported user role enum values")
    void shouldPersistAndReadAllSupportedUserRoleEnumValues() {
        for (UserRole role : UserRole.values()) {
            User user = User.builder()
                    .email(role.name().toLowerCase() + "@roles.test")
                    .passwordHash("hash-" + role.name().toLowerCase())
                    .firstName("Role")
                    .lastName(role.name())
                    .role(role)
                    .isActive(true)
                    .build();

            User saved = userRepository.saveAndFlush(user);
            entityManager.clear();

            User reloaded = userRepository.findById(saved.getId()).orElseThrow();

            assertThat(reloaded.getRole()).isEqualTo(role);
        }
    }

    @Test
    @DisplayName("Should find user by exact and case-insensitive email lookups")
    void shouldFindUserByExactAndCaseInsensitiveEmailLookups() {
        User user = User.builder()
                .email("lookup@Test.com")
                .passwordHash("hash-lookup")
                .firstName("Lookup")
                .lastName("User")
                .role(UserRole.ADMIN)
                .isActive(true)
                .build();
        userRepository.saveAndFlush(user);

        assertThat(userRepository.findByEmail("lookup@test.com")).isPresent();
        assertThat(userRepository.findByEmailIgnoreCase("LOOKUP@test.com")).isPresent();
        assertThat(userRepository.findByEmailIgnoreCase("lookup@test.COM"))
                .map(User::getEmail)
                .contains("lookup@test.com");
        assertThat(userRepository.findByEmail("missing@test.com")).isNotPresent();
        assertThat(userRepository.findByEmailIgnoreCase("missing@test.com")).isNotPresent();
    }

    @Test
    @DisplayName("Should normalize email to lowercase before persist")
    void shouldNormalizeEmailToLowercaseBeforePersist() {
            User user = User.builder()
                .email("Mixed.Case@Example.COM")
                .passwordHash("hash-normalize-create")
                .firstName("Normalize")
                .lastName("Create")
                .role(UserRole.TEACHER)
                .isActive(true)
                .build();

        User saved = userRepository.saveAndFlush(user);

        assertThat(saved.getEmail()).isEqualTo("mixed.case@example.com");
        assertThat(userRepository.findByEmail("mixed.case@example.com")).isPresent();
    }

    @Test
    @DisplayName("Should normalize email to lowercase before update")
    void shouldNormalizeEmailToLowercaseBeforeUpdate() {
            User user = User.builder()
                .email("update@test.com")
                .passwordHash("hash-normalize-update")
                .firstName("Normalize")
                .lastName("Update")
                .role(UserRole.COUNSELOR)
                .isActive(true)
                .build();
            User saved = userRepository.saveAndFlush(user);

            saved.setEmail("Updated.Case@Test.COM");
            userRepository.saveAndFlush(saved);
            entityManager.clear();

            User reloaded = userRepository.findById(saved.getId()).orElseThrow();

            assertThat(reloaded.getEmail()).isEqualTo("updated.case@test.com");
        }
}
