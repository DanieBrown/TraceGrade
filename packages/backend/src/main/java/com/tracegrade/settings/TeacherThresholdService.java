package com.tracegrade.settings;

import java.math.BigDecimal;

import org.springframework.security.core.Authentication;

import com.tracegrade.settings.dto.response.TeacherThresholdResponse;

public interface TeacherThresholdService {

    TeacherThresholdResponse getCurrentTeacherThreshold(Authentication authentication);

    TeacherThresholdResponse updateCurrentTeacherThreshold(Authentication authentication, BigDecimal threshold);
}
