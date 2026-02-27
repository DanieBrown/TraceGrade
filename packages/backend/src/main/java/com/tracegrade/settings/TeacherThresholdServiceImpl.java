package com.tracegrade.settings;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tracegrade.domain.model.User;
import com.tracegrade.domain.model.UserRole;
import com.tracegrade.domain.repository.UserRepository;
import com.tracegrade.exception.ResourceNotFoundException;
import com.tracegrade.grading.GradingProperties;
import com.tracegrade.settings.dto.response.TeacherThresholdResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class TeacherThresholdServiceImpl implements TeacherThresholdService {

    private static final BigDecimal SAFE_DEFAULT_CONFIDENCE_THRESHOLD = BigDecimal.valueOf(0.80);
    private static final String SOURCE_DEFAULT = "default";
    private static final String SOURCE_TEACHER_OVERRIDE = "teacher_override";

    private final UserRepository userRepository;
    private final GradingProperties gradingProperties;

    @Override
    @Transactional(readOnly = true)
    public TeacherThresholdResponse getCurrentTeacherThreshold(Authentication authentication) {
        User teacher = getAuthenticatedTeacher(authentication);
        return toResponse(teacher.getConfidenceThreshold());
    }

    @Override
    @Transactional
    public TeacherThresholdResponse updateCurrentTeacherThreshold(Authentication authentication, BigDecimal threshold) {
        User teacher = getAuthenticatedTeacher(authentication);
        teacher.setConfidenceThreshold(threshold);
        userRepository.save(teacher);
        return toResponse(teacher.getConfidenceThreshold());
    }

    private TeacherThresholdResponse toResponse(BigDecimal teacherThreshold) {
        if (teacherThreshold != null) {
            return TeacherThresholdResponse.builder()
                    .effectiveThreshold(teacherThreshold)
                    .source(SOURCE_TEACHER_OVERRIDE)
                    .teacherThreshold(teacherThreshold)
                    .build();
        }

        BigDecimal defaultThreshold = resolveConfiguredDefaultThreshold();
        return TeacherThresholdResponse.builder()
                .effectiveThreshold(defaultThreshold)
                .source(SOURCE_DEFAULT)
                .teacherThreshold(null)
                .build();
    }

    private BigDecimal resolveConfiguredDefaultThreshold() {
        double configuredThreshold = gradingProperties.getConfidenceThreshold();
        if (isValidThreshold(configuredThreshold)) {
            return BigDecimal.valueOf(configuredThreshold);
        }

        log.warn("Invalid configured grading confidence-threshold={} for teacher settings, using safe fallback={}",
                configuredThreshold, SAFE_DEFAULT_CONFIDENCE_THRESHOLD);
        return SAFE_DEFAULT_CONFIDENCE_THRESHOLD;
    }

    private boolean isValidThreshold(double threshold) {
        return Double.isFinite(threshold) && threshold >= 0.0 && threshold <= 1.0;
    }

    private User getAuthenticatedTeacher(Authentication authentication) {
        UUID teacherId = resolveTeacherId(authentication);
        return userRepository.findByIdAndRoleAndIsActiveTrue(teacherId, UserRole.TEACHER)
                .orElseThrow(() -> new ResourceNotFoundException("User", teacherId));
    }

    private UUID resolveTeacherId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Authentication is required");
        }

        UUID teacherId = extractTeacherId(authentication.getPrincipal());
        if (teacherId == null) {
            teacherId = extractTeacherId(authentication.getDetails());
        }
        if (teacherId == null) {
            teacherId = extractTeacherId(authentication.getName());
        }

        if (teacherId != null) {
            return teacherId;
        }

        throw new AccessDeniedException("Authenticated principal does not contain a valid teacher identifier");
    }

    private UUID extractTeacherId(Object source) {
        if (source == null) {
            return null;
        }

        if (source instanceof UUID uuid) {
            return uuid;
        }

        if (source instanceof CharSequence value) {
            return parseUuid(value.toString());
        }

        if (source instanceof Map<?, ?> attributes) {
            for (String key : List.of("teacher_id", "teacherId", "user_id", "userId", "sub", "id")) {
                UUID candidate = extractTeacherId(attributes.get(key));
                if (candidate != null) {
                    return candidate;
                }
            }
            return null;
        }

        UUID fromIdAccessor = invokeNoArgUuidAccessor(source, "getId");
        if (fromIdAccessor != null) {
            return fromIdAccessor;
        }

        UUID fromAttributesAccessor = invokeClaimsAccessor(source, "getAttributes");
        if (fromAttributesAccessor != null) {
            return fromAttributesAccessor;
        }

        UUID fromClaimsAccessor = invokeClaimsAccessor(source, "getClaims");
        if (fromClaimsAccessor != null) {
            return fromClaimsAccessor;
        }

        UUID fromSubjectAccessor = invokeNoArgUuidAccessor(source, "getSubject");
        if (fromSubjectAccessor != null) {
            return fromSubjectAccessor;
        }

        return null;
    }

    private UUID invokeClaimsAccessor(Object source, String methodName) {
        try {
            Object value = source.getClass().getMethod(methodName).invoke(source);
            return extractTeacherId(value);
        } catch (ReflectiveOperationException | RuntimeException ignored) {
            return null;
        }
    }

    private UUID invokeNoArgUuidAccessor(Object source, String methodName) {
        try {
            Object value = source.getClass().getMethod(methodName).invoke(source);
            return extractTeacherId(value);
        } catch (ReflectiveOperationException | RuntimeException ignored) {
            return null;
        }
    }

    private UUID parseUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }
}
