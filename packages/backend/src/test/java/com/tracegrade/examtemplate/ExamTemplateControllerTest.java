package com.tracegrade.examtemplate;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tracegrade.domain.model.DifficultyLevel;
import com.tracegrade.dto.request.CreateExamTemplateRequest;
import com.tracegrade.dto.request.UpdateExamTemplateRequest;
import com.tracegrade.dto.response.ExamTemplateResponse;
import com.tracegrade.exception.DuplicateResourceException;
import com.tracegrade.exception.GlobalExceptionHandler;
import com.tracegrade.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SuppressWarnings("null")
class ExamTemplateControllerTest {

    private MockMvc mockMvc;

    private ExamTemplateService examTemplateService;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        examTemplateService = mock(ExamTemplateService.class);
        ExamTemplateController controller = new ExamTemplateController(examTemplateService);
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();

        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("POST create returns 201 with ApiResponse envelope")
    void createExamTemplateReturnsCreated() throws Exception {
        UUID id = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();

        CreateExamTemplateRequest request = CreateExamTemplateRequest.builder()
                .name("Algebra Midterm")
                .subject("Mathematics")
                .gradeLevel("10th Grade")
                .totalPoints(new BigDecimal("100"))
                .questionsJson("[]")
                .build();

        when(examTemplateService.createExamTemplate(eq(teacherId), any(CreateExamTemplateRequest.class)))
                .thenReturn(buildResponse(id, teacherId));

        mockMvc.perform(post("/api/exam-templates")
                        .principal(principal(teacherId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(id.toString())))
                .andExpect(jsonPath("$.data.teacherId", is(teacherId.toString())))
                .andExpect(jsonPath("$.data.name", is("Algebra Midterm")));

        verify(examTemplateService).createExamTemplate(eq(teacherId), any(CreateExamTemplateRequest.class));
    }

    @Test
    @DisplayName("POST create returns 400 when payload is invalid")
    void createExamTemplateReturnsBadRequestOnInvalidPayload() throws Exception {
        UUID teacherId = UUID.randomUUID();

        mockMvc.perform(post("/api/exam-templates")
                        .principal(principal(teacherId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("VALIDATION_ERROR")));

        verifyNoInteractions(examTemplateService);
    }

    @Test
    @DisplayName("GET list returns 200 with ApiResponse list payload")
    void getExamTemplatesReturnsList() throws Exception {
        UUID teacherId = UUID.randomUUID();
        UUID templateId = UUID.randomUUID();

        when(examTemplateService.getExamTemplates(eq(teacherId), eq("Mathematics"), eq("10th Grade")))
                .thenReturn(List.of(buildResponse(templateId, teacherId)));

        mockMvc.perform(get("/api/exam-templates")
                        .principal(principal(teacherId))
                        .param("subject", "Mathematics")
                        .param("gradeLevel", "10th Grade"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.length()", is(1)))
                .andExpect(jsonPath("$.data[0].id", is(templateId.toString())));

        verify(examTemplateService).getExamTemplates(eq(teacherId), eq("Mathematics"), eq("10th Grade"));
    }

    @Test
    @DisplayName("GET by id returns 200 with ApiResponse payload")
    void getExamTemplateByIdReturnsOk() throws Exception {
        UUID id = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();

        when(examTemplateService.getExamTemplateById(teacherId, id)).thenReturn(buildResponse(id, teacherId));

        mockMvc.perform(get("/api/exam-templates/{id}", id)
                        .principal(principal(teacherId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(id.toString())));

        verify(examTemplateService).getExamTemplateById(teacherId, id);
    }

    @Test
    @DisplayName("GET by id returns 404 when template is missing")
    void getExamTemplateByIdReturnsNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();

        when(examTemplateService.getExamTemplateById(teacherId, id))
                .thenThrow(new ResourceNotFoundException("ExamTemplate", id));

        mockMvc.perform(get("/api/exam-templates/{id}", id)
                        .principal(principal(teacherId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("NOT_FOUND")));

        verify(examTemplateService).getExamTemplateById(teacherId, id);
    }

    @Test
    @DisplayName("PATCH update returns 200 with ApiResponse payload")
    void updateExamTemplateReturnsOk() throws Exception {
        UUID id = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();

        UpdateExamTemplateRequest request = UpdateExamTemplateRequest.builder()
                .name("Algebra Midterm v2")
                .totalPoints(new BigDecimal("120"))
                .build();

        when(examTemplateService.updateExamTemplate(eq(teacherId), eq(id), any(UpdateExamTemplateRequest.class)))
                .thenReturn(buildResponse(id, teacherId));

        mockMvc.perform(patch("/api/exam-templates/{id}", id)
                        .principal(principal(teacherId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(id.toString())));

        verify(examTemplateService).updateExamTemplate(eq(teacherId), eq(id), any(UpdateExamTemplateRequest.class));
    }

    @Test
    @DisplayName("PATCH update returns 415 when content-type is unsupported")
    void updateExamTemplateReturnsUnsupportedMediaType() throws Exception {
        UUID id = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();

        mockMvc.perform(patch("/api/exam-templates/{id}", id)
                        .principal(principal(teacherId))
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("name=invalid"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("UNSUPPORTED_MEDIA_TYPE")));

        verifyNoInteractions(examTemplateService);
    }

    @Test
    @DisplayName("PATCH update returns 404 when template is missing")
    void updateExamTemplateReturnsNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();

        UpdateExamTemplateRequest request = UpdateExamTemplateRequest.builder()
                .name("Algebra Midterm v2")
                .build();

        when(examTemplateService.updateExamTemplate(eq(teacherId), eq(id), any(UpdateExamTemplateRequest.class)))
                .thenThrow(new ResourceNotFoundException("ExamTemplate", id));

        mockMvc.perform(patch("/api/exam-templates/{id}", id)
                        .principal(principal(teacherId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("NOT_FOUND")));

        verify(examTemplateService).updateExamTemplate(eq(teacherId), eq(id), any(UpdateExamTemplateRequest.class));
    }

    @Test
    @DisplayName("PATCH update returns 409 when name conflicts")
    void updateExamTemplateReturnsConflict() throws Exception {
        UUID id = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();

        UpdateExamTemplateRequest request = UpdateExamTemplateRequest.builder()
                .name("Duplicate Name")
                .build();

        when(examTemplateService.updateExamTemplate(eq(teacherId), eq(id), any(UpdateExamTemplateRequest.class)))
                .thenThrow(new DuplicateResourceException("ExamTemplate", "name", "Duplicate Name"));

        mockMvc.perform(patch("/api/exam-templates/{id}", id)
                        .principal(principal(teacherId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("CONFLICT")));

        verify(examTemplateService).updateExamTemplate(eq(teacherId), eq(id), any(UpdateExamTemplateRequest.class));
    }

    @Test
        @DisplayName("GET list returns 200 when principal name is not UUID but contains teacher identifier attribute")
        void getExamTemplatesReturnsOkForNonUuidPrincipalNameWhenTeacherIdAttributeExists() throws Exception {
                UUID teacherId = UUID.randomUUID();

                when(examTemplateService.getExamTemplates(eq(teacherId), eq(null), eq(null)))
                                .thenReturn(List.of());

        mockMvc.perform(get("/api/exam-templates")
                                                                                                .principal(authentication(Map.of("teacher_id", teacherId.toString()))))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success", is(true)))
                                .andExpect(jsonPath("$.data.length()", is(0)));

                verify(examTemplateService).getExamTemplates(eq(teacherId), eq(null), eq(null));
    }

    @Test
    @DisplayName("DELETE returns 204 when template is deleted")
    void deleteExamTemplateReturnsNoContent() throws Exception {
        UUID id = UUID.randomUUID();
                UUID teacherId = UUID.randomUUID();

                mockMvc.perform(delete("/api/exam-templates/{id}", id)
                                                .principal(principal(teacherId)))
                .andExpect(status().isNoContent());

                verify(examTemplateService).deleteExamTemplate(teacherId, id);
    }

    @Test
    @DisplayName("DELETE returns 404 when template is missing")
    void deleteExamTemplateReturnsNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        UUID teacherId = UUID.randomUUID();
        doThrow(new ResourceNotFoundException("ExamTemplate", id))
                .when(examTemplateService)
                .deleteExamTemplate(teacherId, id);

        mockMvc.perform(delete("/api/exam-templates/{id}", id)
                        .principal(principal(teacherId)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("NOT_FOUND")));

        verify(examTemplateService).deleteExamTemplate(teacherId, id);
    }

        private static Authentication principal(UUID teacherId) {
                return authentication(teacherId.toString());
        }

        private static Authentication authentication(Object principal) {
                return new UsernamePasswordAuthenticationToken(principal, "N/A", List.of());
        }

        private static Authentication authentication(String name) {
                return authentication((Object) name);
    }

    private static ExamTemplateResponse buildResponse(UUID id, UUID teacherId) {
        return ExamTemplateResponse.builder()
                .id(id)
                .teacherId(teacherId)
                .name("Algebra Midterm")
                .subject("Mathematics")
                .topic("Linear Equations")
                .gradeLevel("10th Grade")
                .difficultyLevel(DifficultyLevel.MEDIUM)
                .totalPoints(new BigDecimal("100"))
                .questionsJson("[]")
                .createdAt(Instant.parse("2026-02-24T00:00:00Z"))
                .updatedAt(Instant.parse("2026-02-24T00:00:00Z"))
                .build();
    }
}
