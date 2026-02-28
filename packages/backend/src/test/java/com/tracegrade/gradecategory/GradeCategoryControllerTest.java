package com.tracegrade.gradecategory;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tracegrade.config.CorsProperties;
import com.tracegrade.config.CsrfAccessDeniedHandler;
import com.tracegrade.config.CsrfProperties;
import com.tracegrade.config.SecurityConfig;
import com.tracegrade.config.SecurityHeadersProperties;
import com.tracegrade.dto.request.CreateGradeCategoryRequest;
import com.tracegrade.dto.request.UpdateGradeCategoryRequest;
import com.tracegrade.dto.response.GradeCategoryResponse;
import com.tracegrade.exception.DuplicateResourceException;
import com.tracegrade.exception.ResourceNotFoundException;
import com.tracegrade.filter.SanitizationProperties;
import com.tracegrade.ratelimit.RateLimitProperties;
import com.tracegrade.ratelimit.RateLimitService;

@WebMvcTest(GradeCategoryController.class)
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
@SuppressWarnings("null")
class GradeCategoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private GradeCategoryService gradeCategoryService;

    @MockBean
    private RateLimitService rateLimitService;

    // ---- GET /categories ----

    @Test
    @DisplayName("GET categories returns 200 with list of categories")
    void listCategories_returns200WithList() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        List<GradeCategoryResponse> categories = List.of(
                GradeCategoryResponse.builder()
                        .id(UUID.randomUUID()).classId(classId).name("Tests")
                        .weight(BigDecimal.valueOf(60)).dropLowest(0).build(),
                GradeCategoryResponse.builder()
                        .id(UUID.randomUUID()).classId(classId).name("Homework")
                        .weight(BigDecimal.valueOf(40)).dropLowest(0).build()
        );

        when(gradeCategoryService.listCategories(eq(schoolId), eq(classId))).thenReturn(categories);

        mockMvc.perform(get("/api/schools/{schoolId}/classes/{classId}/categories", schoolId, classId)
                        .with(user(schoolId.toString())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].name", is("Tests")))
                .andExpect(jsonPath("$.data[1].name", is("Homework")));

        verify(gradeCategoryService).listCategories(schoolId, classId);
    }

    @Test
    @DisplayName("GET categories returns 401 when unauthenticated")
    void listCategories_returnsUnauthorizedWhenUnauthenticated() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        mockMvc.perform(get("/api/schools/{schoolId}/classes/{classId}/categories", schoolId, classId))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(gradeCategoryService);
    }

    @Test
    @DisplayName("GET categories returns 403 when authenticated as different school")
    void listCategories_returns403WhenDifferentSchool() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID differentSchoolId = UUID.randomUUID();

        mockMvc.perform(get("/api/schools/{schoolId}/classes/{classId}/categories", schoolId, classId)
                        .with(user(differentSchoolId.toString())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ACCESS_DENIED")));

        verifyNoInteractions(gradeCategoryService);
    }

    @Test
    @DisplayName("GET categories returns 404 when class not found")
    void listCategories_returns404WhenClassNotFound() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        when(gradeCategoryService.listCategories(any(), any()))
                .thenThrow(new ResourceNotFoundException("Class", classId));

        mockMvc.perform(get("/api/schools/{schoolId}/classes/{classId}/categories", schoolId, classId)
                        .with(user(schoolId.toString())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("NOT_FOUND")));
    }

    // ---- POST /categories ----

    @Test
    @DisplayName("POST categories returns 201 with created category")
    void createCategory_returns201WhenAuthenticated() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        CreateGradeCategoryRequest request = CreateGradeCategoryRequest.builder()
                .name("Tests")
                .weight(BigDecimal.valueOf(60))
                .dropLowest(0)
                .color("#FF5733")
                .build();

        GradeCategoryResponse response = GradeCategoryResponse.builder()
                .id(categoryId).classId(classId).name("Tests")
                .weight(BigDecimal.valueOf(60)).dropLowest(0).color("#FF5733")
                .build();

        when(gradeCategoryService.createCategory(eq(schoolId), eq(classId), any(CreateGradeCategoryRequest.class)))
                .thenReturn(response);

        mockMvc.perform(post("/api/schools/{schoolId}/classes/{classId}/categories", schoolId, classId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.name", is("Tests")))
                .andExpect(jsonPath("$.data.classId", is(classId.toString())));

        verify(gradeCategoryService).createCategory(eq(schoolId), eq(classId), any(CreateGradeCategoryRequest.class));
    }

    @Test
    @DisplayName("POST categories returns 401 when unauthenticated")
    void createCategory_returnsUnauthorizedWhenUnauthenticated() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        CreateGradeCategoryRequest request = CreateGradeCategoryRequest.builder()
                .name("Tests").weight(BigDecimal.valueOf(60)).dropLowest(0).build();

        mockMvc.perform(post("/api/schools/{schoolId}/classes/{classId}/categories", schoolId, classId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(gradeCategoryService);
    }

    @Test
    @DisplayName("POST categories returns 403 when authenticated as different school")
    void createCategory_returns403WhenDifferentSchool() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID differentSchoolId = UUID.randomUUID();

        CreateGradeCategoryRequest request = CreateGradeCategoryRequest.builder()
                .name("Tests").weight(BigDecimal.valueOf(60)).dropLowest(0).build();

        mockMvc.perform(post("/api/schools/{schoolId}/classes/{classId}/categories", schoolId, classId)
                        .with(user(differentSchoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ACCESS_DENIED")));

        verifyNoInteractions(gradeCategoryService);
    }

    @Test
    @DisplayName("POST categories returns 409 when name already exists")
    void createCategory_returns409WhenDuplicateName() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        when(gradeCategoryService.createCategory(any(), any(), any()))
                .thenThrow(new DuplicateResourceException("GradeCategory", "name", "Tests"));

        mockMvc.perform(post("/api/schools/{schoolId}/classes/{classId}/categories", schoolId, classId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Tests\",\"weight\":60,\"dropLowest\":0}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)));
    }

    @Test
    @DisplayName("POST categories returns 400 when weight would exceed 100%")
    void createCategory_returns400WhenWeightExceeds100() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();

        when(gradeCategoryService.createCategory(any(), any(), any()))
                .thenThrow(new IllegalArgumentException("Total category weight would exceed 100%"));

        mockMvc.perform(post("/api/schools/{schoolId}/classes/{classId}/categories", schoolId, classId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Quizzes\",\"weight\":50,\"dropLowest\":0}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("VALIDATION_ERROR")));
    }

    // ---- PUT /categories/{categoryId} ----

    @Test
    @DisplayName("PUT category returns 200 with updated category")
    void updateCategory_returns200OnSuccess() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        UpdateGradeCategoryRequest request = UpdateGradeCategoryRequest.builder()
                .name("Exams")
                .weight(BigDecimal.valueOf(50))
                .build();

        GradeCategoryResponse response = GradeCategoryResponse.builder()
                .id(categoryId).classId(classId).name("Exams")
                .weight(BigDecimal.valueOf(50)).dropLowest(0)
                .build();

        when(gradeCategoryService.updateCategory(eq(schoolId), eq(classId), eq(categoryId),
                any(UpdateGradeCategoryRequest.class))).thenReturn(response);

        mockMvc.perform(put("/api/schools/{schoolId}/classes/{classId}/categories/{categoryId}",
                        schoolId, classId, categoryId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.name", is("Exams")));

        verify(gradeCategoryService).updateCategory(eq(schoolId), eq(classId), eq(categoryId),
                any(UpdateGradeCategoryRequest.class));
    }

    @Test
    @DisplayName("PUT category returns 404 when category not found")
    void updateCategory_returns404WhenNotFound() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        when(gradeCategoryService.updateCategory(any(), any(), any(), any()))
                .thenThrow(new ResourceNotFoundException("GradeCategory", categoryId));

        mockMvc.perform(put("/api/schools/{schoolId}/classes/{classId}/categories/{categoryId}",
                        schoolId, classId, categoryId)
                        .with(user(schoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Exams\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("NOT_FOUND")));
    }

    @Test
    @DisplayName("PUT category returns 403 when authenticated as different school")
    void updateCategory_returns403WhenDifferentSchool() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();
        UUID differentSchoolId = UUID.randomUUID();

        mockMvc.perform(put("/api/schools/{schoolId}/classes/{classId}/categories/{categoryId}",
                        schoolId, classId, categoryId)
                        .with(user(differentSchoolId.toString()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Exams\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ACCESS_DENIED")));

        verifyNoInteractions(gradeCategoryService);
    }

    // ---- DELETE /categories/{categoryId} ----

    @Test
    @DisplayName("DELETE category returns 204 on success")
    void deleteCategory_returns204OnSuccess() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        doNothing().when(gradeCategoryService).deleteCategory(eq(schoolId), eq(classId), eq(categoryId));

        mockMvc.perform(delete("/api/schools/{schoolId}/classes/{classId}/categories/{categoryId}",
                        schoolId, classId, categoryId)
                        .with(user(schoolId.toString())))
                .andExpect(status().isNoContent());

        verify(gradeCategoryService).deleteCategory(schoolId, classId, categoryId);
    }

    @Test
    @DisplayName("DELETE category returns 404 when category not found")
    void deleteCategory_returns404WhenNotFound() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        doThrow(new ResourceNotFoundException("GradeCategory", categoryId))
                .when(gradeCategoryService).deleteCategory(any(), any(), any());

        mockMvc.perform(delete("/api/schools/{schoolId}/classes/{classId}/categories/{categoryId}",
                        schoolId, classId, categoryId)
                        .with(user(schoolId.toString())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("NOT_FOUND")));
    }

    @Test
    @DisplayName("DELETE category returns 401 when unauthenticated")
    void deleteCategory_returnsUnauthorizedWhenUnauthenticated() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        mockMvc.perform(delete("/api/schools/{schoolId}/classes/{classId}/categories/{categoryId}",
                        schoolId, classId, categoryId))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(gradeCategoryService);
    }

    @Test
    @DisplayName("DELETE category returns 403 when authenticated as different school")
    void deleteCategory_returns403WhenDifferentSchool() throws Exception {
        UUID schoolId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();
        UUID differentSchoolId = UUID.randomUUID();

        mockMvc.perform(delete("/api/schools/{schoolId}/classes/{classId}/categories/{categoryId}",
                        schoolId, classId, categoryId)
                        .with(user(differentSchoolId.toString())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ACCESS_DENIED")));

        verifyNoInteractions(gradeCategoryService);
    }
}
