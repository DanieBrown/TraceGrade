package com.tracegrade.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CsrfPropertiesTest {

    @Test
    @DisplayName("Should have secure defaults")
    void shouldHaveSecureDefaults() {
        CsrfProperties props = new CsrfProperties();

        assertThat(props.isEnabled()).isTrue();
        assertThat(props.getCookieName()).isEqualTo("XSRF-TOKEN");
        assertThat(props.getHeaderName()).isEqualTo("X-XSRF-TOKEN");
        assertThat(props.getCookiePath()).isEqualTo("/");
        assertThat(props.isCookieSecure()).isTrue();
        assertThat(props.getSameSite()).isEqualTo("Strict");
    }

    @Test
    @DisplayName("Should allow overriding all properties")
    void shouldAllowOverrides() {
        CsrfProperties props = new CsrfProperties();
        props.setEnabled(false);
        props.setCookieName("MY-CSRF");
        props.setHeaderName("X-MY-CSRF");
        props.setCookiePath("/api");
        props.setCookieSecure(false);
        props.setSameSite("Lax");

        assertThat(props.isEnabled()).isFalse();
        assertThat(props.getCookieName()).isEqualTo("MY-CSRF");
        assertThat(props.getHeaderName()).isEqualTo("X-MY-CSRF");
        assertThat(props.getCookiePath()).isEqualTo("/api");
        assertThat(props.isCookieSecure()).isFalse();
        assertThat(props.getSameSite()).isEqualTo("Lax");
    }
}
