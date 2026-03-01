package com.tracegrade.auth;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tracegrade.domain.model.User;
import com.tracegrade.domain.model.UserRole;
import com.tracegrade.domain.repository.UserRepository;
import com.tracegrade.dto.request.RegisterRequest;
import com.tracegrade.exception.DuplicateResourceException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service handling user registration and login.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    /**
     * Registers a new teacher account.
     *
     * @param request registration details
     * @return JWT token for the newly created user
     * @throws DuplicateResourceException if email already exists
     */
    @Transactional
    public String register(RegisterRequest request) {
        String normalizedEmail = request.getEmail().toLowerCase();
        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new DuplicateResourceException("User", "email", normalizedEmail);
        }

        User user = User.builder()
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .role(UserRole.TEACHER)
                .isActive(true)
                .build();

        user = userRepository.save(user);
        log.info("Registered new user: {}", normalizedEmail);
        return jwtService.generateToken(user.getId(), user.getEmail());
    }

    /**
     * Authenticates a user and returns a JWT token.
     *
     * @param email    the user's email
     * @param password the raw password
     * @return JWT token
     * @throws BadCredentialsException if credentials are invalid
     */
    @Transactional(readOnly = true)
    public String login(String email, String password) {
        String normalizedEmail = email.toLowerCase();
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new BadCredentialsException("Account is inactive");
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        return jwtService.generateToken(user.getId(), user.getEmail());
    }
}
