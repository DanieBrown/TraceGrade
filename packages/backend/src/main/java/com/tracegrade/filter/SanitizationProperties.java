package com.tracegrade.filter;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Data;

@Data
@Component
@ConfigurationProperties(prefix = "sanitization")
public class SanitizationProperties {

    private boolean enabled = true;
}
