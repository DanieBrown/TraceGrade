package com.tracegrade.dto;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Field;
import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.tracegrade.dto.request.CreateStudentRequest;
import com.tracegrade.dto.request.UpdateStudentRequest;
import com.tracegrade.dto.response.StudentResponse;

class StudentDtoSerializationTest {

    private final ObjectMapper objectMapper = JsonMapper.builder()
            .findAndAddModules()
            .build();

    @Test
    @DisplayName("Student responses should not serialize the legacy student number field")
    void studentResponseShouldNotSerializeLegacyStudentNumberField() throws Exception {
        StudentResponse response = StudentResponse.builder()
                .id(UUID.fromString("00000000-0000-4000-a000-000000000001"))
                .schoolId(UUID.fromString("00000000-0000-4000-a000-000000000002"))
                .firstName("Alice")
                .lastName("Smith")
                .email("alice@example.com")
                .isActive(true)
                .createdAt(Instant.parse("2026-04-02T12:00:00Z"))
                .updatedAt(Instant.parse("2026-04-02T12:00:00Z"))
                .build();

        setLegacyStudentNumberIfPresent(response, "STU-2026-001");

        String json = objectMapper.writeValueAsString(response);

        assertThat(json).doesNotContain("studentNumber");
    }

    @Test
    @DisplayName("Create student requests should not serialize the legacy student number field")
    void createStudentRequestShouldNotSerializeLegacyStudentNumberField() throws Exception {
        CreateStudentRequest request = CreateStudentRequest.builder()
                .schoolId(UUID.fromString("00000000-0000-4000-a000-000000000002"))
                .firstName("Alice")
                .lastName("Smith")
                .email("alice@example.com")
                .build();

        setLegacyStudentNumberIfPresent(request, "STU-2026-001");

        String json = objectMapper.writeValueAsString(request);

        assertThat(json).doesNotContain("studentNumber");
    }

    @Test
    @DisplayName("Update student requests should not serialize the legacy student number field")
    void updateStudentRequestShouldNotSerializeLegacyStudentNumberField() throws Exception {
        UpdateStudentRequest request = UpdateStudentRequest.builder()
                .firstName("Alice")
                .lastName("Smith")
                .email("alice@example.com")
                .isActive(true)
                .build();

        setLegacyStudentNumberIfPresent(request, "STU-2026-001");

        String json = objectMapper.writeValueAsString(request);

        assertThat(json).doesNotContain("studentNumber");
    }

    private void setLegacyStudentNumberIfPresent(Object target, String value) throws IllegalAccessException {
        for (Field field : target.getClass().getDeclaredFields()) {
            if (!"studentNumber".equals(field.getName())) {
                continue;
            }

            field.setAccessible(true);
            field.set(target, value);
            return;
        }
    }
}