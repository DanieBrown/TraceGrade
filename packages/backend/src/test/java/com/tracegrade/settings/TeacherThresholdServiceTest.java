package com.tracegrade.settings;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;

import com.tracegrade.domain.model.User;
import com.tracegrade.domain.model.UserRole;
import com.tracegrade.domain.repository.UserRepository;
import com.tracegrade.exception.ResourceNotFoundException;
import com.tracegrade.grading.GradingProperties;
import com.tracegrade.settings.dto.response.TeacherThresholdResponse;

@SuppressWarnings("null")
class TeacherThresholdServiceTest {

    private UserRepository userRepository;
    private GradingProperties gradingProperties;
    private TeacherThresholdServiceImpl service;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        gradingProperties = new GradingProperties();
        gradingProperties.setConfidenceThreshold(0.80);
        service = new TeacherThresholdServiceImpl(userRepository, gradingProperties);
    }

    @Test
    @DisplayName("Returns default threshold semantics when teacher override is null")
    void returnsDefaultThresholdWhenTeacherHasNoOverride() {
        UUID teacherId = UUID.randomUUID();
        User teacher = teacher(teacherId, null);

        when(userRepository.findByIdAndRoleAndIsActiveTrue(teacherId, UserRole.TEACHER))
                .thenReturn(Optional.of(teacher));

        TeacherThresholdResponse response = service.getCurrentTeacherThreshold(authenticated(teacherId.toString()));

        assertThat(response.getEffectiveThreshold()).isEqualByComparingTo("0.8");
        assertThat(response.getSource()).isEqualTo("default");
        assertThat(response.getTeacherThreshold()).isNull();
    }

    @Test
    @DisplayName("Uses safe default threshold semantics when configured default is invalid")
    void usesSafeDefaultWhenConfiguredThresholdIsInvalid() {
        gradingProperties.setConfidenceThreshold(1.50);

        UUID teacherId = UUID.randomUUID();
        User teacher = teacher(teacherId, null);

        when(userRepository.findByIdAndRoleAndIsActiveTrue(teacherId, UserRole.TEACHER))
                .thenReturn(Optional.of(teacher));

        TeacherThresholdResponse response = service.getCurrentTeacherThreshold(authenticated(teacherId.toString()));

        assertThat(response.getEffectiveThreshold()).isEqualByComparingTo("0.8");
        assertThat(response.getSource()).isEqualTo("default");
        assertThat(response.getTeacherThreshold()).isNull();
    }

    @Test
    @DisplayName("Returns teacher override semantics when teacher threshold exists")
    void returnsTeacherOverrideWhenThresholdExists() {
        UUID teacherId = UUID.randomUUID();
        User teacher = teacher(teacherId, new BigDecimal("0.87"));

        when(userRepository.findByIdAndRoleAndIsActiveTrue(teacherId, UserRole.TEACHER))
                .thenReturn(Optional.of(teacher));

        TeacherThresholdResponse response = service.getCurrentTeacherThreshold(authenticated(teacherId.toString()));

        assertThat(response.getEffectiveThreshold()).isEqualByComparingTo("0.87");
        assertThat(response.getSource()).isEqualTo("teacher_override");
        assertThat(response.getTeacherThreshold()).isEqualByComparingTo("0.87");
    }

    @Test
    @DisplayName("Updates current authenticated teacher threshold")
    void updatesCurrentTeacherThreshold() {
        UUID teacherId = UUID.randomUUID();
        User teacher = teacher(teacherId, null);

        when(userRepository.findByIdAndRoleAndIsActiveTrue(teacherId, UserRole.TEACHER))
                .thenReturn(Optional.of(teacher));
        when(userRepository.save(teacher)).thenReturn(teacher);

        TeacherThresholdResponse response = service.updateCurrentTeacherThreshold(
                authenticated(teacherId.toString()), new BigDecimal("1.00"));

        assertThat(teacher.getConfidenceThreshold()).isEqualByComparingTo("1.00");
        assertThat(response.getEffectiveThreshold()).isEqualByComparingTo("1.00");
        assertThat(response.getSource()).isEqualTo("teacher_override");
        assertThat(response.getTeacherThreshold()).isEqualByComparingTo("1.00");
        verify(userRepository).save(teacher);
    }

    @Test
    @DisplayName("Rejects unauthenticated access")
    void rejectsUnauthenticatedAccess() {
        Authentication authentication = mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(false);

        assertThatThrownBy(() -> service.getCurrentTeacherThreshold(authentication))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Authentication is required");
    }

    @Test
    @DisplayName("Rejects principal without valid teacher identifier")
    void rejectsInvalidPrincipalIdentifier() {
        Authentication authentication = mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn("not-a-uuid");
        when(authentication.getDetails()).thenReturn(null);
        when(authentication.getName()).thenReturn("also-not-a-uuid");

        assertThatThrownBy(() -> service.getCurrentTeacherThreshold(authentication))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("valid teacher identifier");
    }

    @Test
    @DisplayName("Rejects non-teacher principal context")
    void rejectsNonTeacherPrincipalContext() {
        UUID teacherId = UUID.randomUUID();

        when(userRepository.findByIdAndRoleAndIsActiveTrue(teacherId, UserRole.TEACHER))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getCurrentTeacherThreshold(authenticated(teacherId.toString())))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("User");
    }

    private static User teacher(UUID id, BigDecimal threshold) {
        User teacher = User.builder()
                .email("teacher@test.com")
                .passwordHash("hash")
                .firstName("Test")
                .lastName("Teacher")
                .role(UserRole.TEACHER)
                .isActive(true)
                .confidenceThreshold(threshold)
                .build();
        teacher.setId(id);
        return teacher;
    }

    private static Authentication authenticated(String principalValue) {
        Authentication authentication = mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(principalValue);
        when(authentication.getDetails()).thenReturn(null);
        when(authentication.getName()).thenReturn(principalValue);
        return authentication;
    }
}
