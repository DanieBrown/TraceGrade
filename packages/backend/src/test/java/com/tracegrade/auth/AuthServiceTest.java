package com.tracegrade.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.tracegrade.domain.model.User;
import com.tracegrade.domain.model.UserRole;
import com.tracegrade.domain.repository.UserRepository;
import com.tracegrade.dto.request.RegisterRequest;
import com.tracegrade.exception.DuplicateResourceException;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    // ---- register() ----

    @Test
    @DisplayName("register() creates user with BCrypt-hashed password and returns JWT")
    void register_createsUserWithHashedPasswordAndReturnsToken() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("Teacher@School.EDU");
        request.setPassword("Secure123!");
        request.setFirstName("Jane");
        request.setLastName("Smith");

        UUID userId = UUID.randomUUID();
        User savedUser = User.builder()
                .email("teacher@school.edu")
                .passwordHash("$2a$encoded")
                .firstName("Jane")
                .lastName("Smith")
                .role(UserRole.TEACHER)
                .isActive(true)
                .build();
        // simulate ID being set after save via BaseEntity
        // We use a spy approach: mock what the service calls
        when(userRepository.findByEmail("teacher@school.edu")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Secure123!")).thenReturn("$2a$encoded");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtService.generateToken(any(), anyString())).thenReturn("test.jwt.token");

        String token = authService.register(request);

        assertThat(token).isEqualTo("test.jwt.token");
        verify(passwordEncoder).encode("Secure123!");
        verify(userRepository).save(any(User.class));
        verify(jwtService).generateToken(any(), anyString());
    }

    @Test
    @DisplayName("register() normalizes email to lowercase before saving")
    void register_normalizesEmailToLowercase() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("Teacher@SCHOOL.EDU");
        request.setPassword("Secure123!");
        request.setFirstName("Jane");
        request.setLastName("Smith");

        when(userRepository.findByEmail("teacher@school.edu")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$encoded");

        User savedUser = User.builder()
                .email("teacher@school.edu")
                .passwordHash("$2a$encoded")
                .firstName("Jane")
                .lastName("Smith")
                .role(UserRole.TEACHER)
                .isActive(true)
                .build();
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtService.generateToken(any(), anyString())).thenReturn("token");

        authService.register(request);

        // Verify that findByEmail was called with the lowercased email
        verify(userRepository).findByEmail("teacher@school.edu");
    }

    @Test
    @DisplayName("register() throws DuplicateResourceException when email already exists")
    void register_throwsWhenEmailAlreadyExists() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("existing@school.edu");
        request.setPassword("Secure123!");
        request.setFirstName("Jane");
        request.setLastName("Smith");

        User existingUser = User.builder()
                .email("existing@school.edu")
                .passwordHash("hash")
                .firstName("Existing")
                .lastName("User")
                .role(UserRole.TEACHER)
                .isActive(true)
                .build();

        when(userRepository.findByEmail("existing@school.edu")).thenReturn(Optional.of(existingUser));

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("email");
    }

    // ---- login() ----

    @Test
    @DisplayName("login() returns JWT for valid credentials")
    void login_returnsTokenForValidCredentials() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .email("teacher@school.edu")
                .passwordHash("$2a$encoded")
                .firstName("Jane")
                .lastName("Smith")
                .role(UserRole.TEACHER)
                .isActive(true)
                .build();

        when(userRepository.findByEmail("teacher@school.edu")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Secure123!", "$2a$encoded")).thenReturn(true);
        when(jwtService.generateToken(any(), anyString())).thenReturn("login.jwt.token");

        String token = authService.login("teacher@school.edu", "Secure123!");

        assertThat(token).isEqualTo("login.jwt.token");
        verify(jwtService).generateToken(any(), anyString());
    }

    @Test
    @DisplayName("login() normalizes email to lowercase before lookup")
    void login_normalizesEmailToLowercase() {
        User user = User.builder()
                .email("teacher@school.edu")
                .passwordHash("$2a$encoded")
                .firstName("Jane")
                .lastName("Smith")
                .role(UserRole.TEACHER)
                .isActive(true)
                .build();

        when(userRepository.findByEmail("teacher@school.edu")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Secure123!", "$2a$encoded")).thenReturn(true);
        when(jwtService.generateToken(any(), anyString())).thenReturn("token");

        authService.login("Teacher@SCHOOL.EDU", "Secure123!");

        verify(userRepository).findByEmail("teacher@school.edu");
    }

    @Test
    @DisplayName("login() throws BadCredentialsException when password does not match")
    void login_throwsBadCredentialsWhenPasswordWrong() {
        User user = User.builder()
                .email("teacher@school.edu")
                .passwordHash("$2a$encoded")
                .firstName("Jane")
                .lastName("Smith")
                .role(UserRole.TEACHER)
                .isActive(true)
                .build();

        when(userRepository.findByEmail("teacher@school.edu")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("WrongPassword", "$2a$encoded")).thenReturn(false);

        assertThatThrownBy(() -> authService.login("teacher@school.edu", "WrongPassword"))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid email or password");
    }

    @Test
    @DisplayName("login() throws BadCredentialsException when email is not found")
    void login_throwsBadCredentialsWhenEmailNotFound() {
        when(userRepository.findByEmail("unknown@school.edu")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login("unknown@school.edu", "Secure123!"))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid email or password");
    }

    @Test
    @DisplayName("login() throws BadCredentialsException when account is inactive")
    void login_throwsBadCredentialsWhenAccountInactive() {
        User inactiveUser = User.builder()
                .email("inactive@school.edu")
                .passwordHash("$2a$encoded")
                .firstName("Jane")
                .lastName("Smith")
                .role(UserRole.TEACHER)
                .isActive(false)
                .build();

        when(userRepository.findByEmail("inactive@school.edu")).thenReturn(Optional.of(inactiveUser));

        assertThatThrownBy(() -> authService.login("inactive@school.edu", "Secure123!"))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("inactive");
    }
}
