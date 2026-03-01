package com.tracegrade.auth;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tracegrade.config.CorsProperties;
import com.tracegrade.config.CsrfAccessDeniedHandler;
import com.tracegrade.config.CsrfProperties;
import com.tracegrade.config.SecurityConfig;
import com.tracegrade.config.SecurityHeadersProperties;
import com.tracegrade.dto.request.LoginRequest;
import com.tracegrade.dto.request.RegisterRequest;
import com.tracegrade.exception.DuplicateResourceException;
import com.tracegrade.filter.SanitizationProperties;
import com.tracegrade.ratelimit.RateLimitProperties;
import com.tracegrade.ratelimit.RateLimitService;

@WebMvcTest(AuthController.class)
@ActiveProfiles("test")
@Import({SecurityConfig.class, SecurityHeadersProperties.class,
         CsrfProperties.class, CsrfAccessDeniedHandler.class,
         CorsProperties.class,
         RateLimitProperties.class, SanitizationProperties.class})
@TestPropertySource(properties = {
        "security-headers.https-redirect-enabled=false",
        "rate-limit.enabled=false",
        "sanitization.enabled=false",
        "csrf.enabled=false"
})
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private RateLimitService rateLimitService;

    // ---- POST /api/auth/register ----

    @Test
    @DisplayName("POST /api/auth/register returns 201 with JWT token on success")
    void register_returnsCreatedWithToken() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("teacher@school.edu");
        request.setPassword("Secure123!");
        request.setFirstName("Jane");
        request.setLastName("Smith");

        when(authService.register(any(RegisterRequest.class)))
                .thenReturn("mocked.jwt.token");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.token", is("mocked.jwt.token")))
                .andExpect(jsonPath("$.data.tokenType", is("Bearer")));
    }

    @Test
    @DisplayName("POST /api/auth/register returns 409 when email is already registered")
    void register_returns409WhenDuplicateEmail() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("existing@school.edu");
        request.setPassword("Secure123!");
        request.setFirstName("Jane");
        request.setLastName("Smith");

        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new DuplicateResourceException("User", "email", "existing@school.edu"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("CONFLICT")));
    }

    @Test
    @DisplayName("POST /api/auth/register returns 400 when email is missing")
    void register_returns400WhenEmailMissing() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"Secure123!\",\"firstName\":\"Jane\",\"lastName\":\"Smith\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)));

        verifyNoInteractions(authService);
    }

    @Test
    @DisplayName("POST /api/auth/register returns 400 when password is too short")
    void register_returns400WhenPasswordTooShort() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("teacher@school.edu");
        request.setPassword("short"); // less than 8 chars
        request.setFirstName("Jane");
        request.setLastName("Smith");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)));

        verifyNoInteractions(authService);
    }

    @Test
    @DisplayName("POST /api/auth/register returns 400 when email format is invalid")
    void register_returns400WhenEmailInvalid() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("not-an-email");
        request.setPassword("Secure123!");
        request.setFirstName("Jane");
        request.setLastName("Smith");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)));

        verifyNoInteractions(authService);
    }

    @Test
    @DisplayName("POST /api/auth/register returns 400 when firstName is blank")
    void register_returns400WhenFirstNameBlank() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"teacher@school.edu\",\"password\":\"Secure123!\",\"firstName\":\"\",\"lastName\":\"Smith\"}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(authService);
    }

    // ---- POST /api/auth/login ----

    @Test
    @DisplayName("POST /api/auth/login returns 200 with JWT token on valid credentials")
    void login_returnsOkWithToken() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail("teacher@school.edu");
        request.setPassword("Secure123!");

        when(authService.login("teacher@school.edu", "Secure123!"))
                .thenReturn("mocked.jwt.token");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.token", is("mocked.jwt.token")))
                .andExpect(jsonPath("$.data.tokenType", is("Bearer")));
    }

    @Test
    @DisplayName("POST /api/auth/login returns 401 when password is wrong")
    void login_returns401WhenWrongPassword() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail("teacher@school.edu");
        request.setPassword("WrongPassword!");

        when(authService.login("teacher@school.edu", "WrongPassword!"))
                .thenThrow(new BadCredentialsException("Invalid email or password"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("UNAUTHORIZED")));
    }

    @Test
    @DisplayName("POST /api/auth/login returns 401 when email is not found")
    void login_returns401WhenEmailNotFound() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setEmail("unknown@school.edu");
        request.setPassword("Secure123!");

        when(authService.login("unknown@school.edu", "Secure123!"))
                .thenThrow(new BadCredentialsException("Invalid email or password"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("UNAUTHORIZED")));
    }

    @Test
    @DisplayName("POST /api/auth/login returns 400 when email is missing")
    void login_returns400WhenEmailMissing() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"Secure123!\"}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(authService);
    }

    @Test
    @DisplayName("POST /api/auth/login returns 400 when password is missing")
    void login_returns400WhenPasswordMissing() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"teacher@school.edu\"}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(authService);
    }

    @Test
    @DisplayName("POST /api/auth/register response contains token and tokenType fields")
    void register_responseContainsExpectedFields() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("teacher@school.edu");
        request.setPassword("Secure123!");
        request.setFirstName("Jane");
        request.setLastName("Smith");

        when(authService.register(any(RegisterRequest.class)))
                .thenReturn("eyJhbGciOiJIUzI1NiJ9.test.token");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.token", notNullValue()))
                .andExpect(jsonPath("$.data.tokenType", is("Bearer")));
    }
}
