package com.tracegrade.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class SecurityHeadersPropertiesTest {

    @Test
    @DisplayName("Should have secure defaults")
    void shouldHaveSecureDefaults() {
        SecurityHeadersProperties props = new SecurityHeadersProperties();

        assertThat(props.isHttpsRedirectEnabled()).isTrue();
        assertThat(props.getHstsMaxAgeSeconds()).isEqualTo(31536000);
        assertThat(props.getContentSecurityPolicy()).contains("default-src 'self'");
        assertThat(props.getContentSecurityPolicy()).contains("script-src 'self'");
        assertThat(props.getContentSecurityPolicy()).contains("style-src 'self' 'unsafe-inline'");
        assertThat(props.getContentSecurityPolicy()).contains("frame-ancestors 'self'");
        assertThat(props.getPermissionsPolicy()).contains("camera=()");
        assertThat(props.getPermissionsPolicy()).contains("microphone=()");
        assertThat(props.getPermissionsPolicy()).contains("geolocation=()");
        assertThat(props.getPermissionsPolicy()).contains("payment=()");
    }

    @Test
    @DisplayName("Should allow overriding all properties")
    void shouldAllowOverrides() {
        SecurityHeadersProperties props = new SecurityHeadersProperties();
        props.setHttpsRedirectEnabled(false);
        props.setHstsMaxAgeSeconds(86400);
        props.setContentSecurityPolicy("default-src 'none'");
        props.setPermissionsPolicy("camera=(self)");

        assertThat(props.isHttpsRedirectEnabled()).isFalse();
        assertThat(props.getHstsMaxAgeSeconds()).isEqualTo(86400);
        assertThat(props.getContentSecurityPolicy()).isEqualTo("default-src 'none'");
        assertThat(props.getPermissionsPolicy()).isEqualTo("camera=(self)");
    }
}
