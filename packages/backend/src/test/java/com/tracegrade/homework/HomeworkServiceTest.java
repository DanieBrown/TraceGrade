package com.tracegrade.homework;

import com.tracegrade.domain.model.Homework;
import com.tracegrade.domain.model.School;
import com.tracegrade.domain.repository.HomeworkRepository;
import com.tracegrade.domain.repository.SchoolRepository;
import com.tracegrade.dto.request.CreateHomeworkRequest;
import com.tracegrade.dto.response.HomeworkResponse;
import com.tracegrade.exception.DuplicateResourceException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SuppressWarnings("null")
class HomeworkServiceTest {

    private HomeworkRepository homeworkRepository;
    private SchoolRepository schoolRepository;
    private HomeworkService homeworkService;

    @BeforeEach
    void setUp() {
        homeworkRepository = mock(HomeworkRepository.class);
        schoolRepository = mock(SchoolRepository.class);
        homeworkService = new HomeworkService(homeworkRepository, schoolRepository);
    }

    @Test
    @DisplayName("createHomework should persist structured materials and map them to the response")
    void createHomeworkPersistsMaterialsJson() {
        UUID schoolId = UUID.randomUUID();
        School school = mock(School.class);
        when(school.getId()).thenReturn(schoolId);

        String materialsJson = "[{\"questionNumber\":1,\"type\":\"open-ended\",\"prompt\":\"What is 8 x 7?\",\"pointsAvailable\":10,\"answerText\":\"56\"}]";

        CreateHomeworkRequest request = CreateHomeworkRequest.builder()
                .schoolId(schoolId)
                .title("Chapter 5 Review")
                .description("Practice multiplication facts")
                .className("Algebra II — Period 3")
                .dueDate(LocalDate.of(2026, 4, 10))
                .maxPoints(new BigDecimal("10"))
                .materialsJson(materialsJson)
                .build();

        when(schoolRepository.findById(schoolId)).thenReturn(Optional.of(school));
        when(homeworkRepository.existsByTitleAndSchoolId("Chapter 5 Review", schoolId)).thenReturn(false);
        when(homeworkRepository.save(any(Homework.class))).thenAnswer(invocation -> {
            Homework homework = invocation.getArgument(0, Homework.class);
            homework.setId(UUID.randomUUID());
            return homework;
        });

        HomeworkResponse response = homeworkService.createHomework(request);

        assertThat(response.getTitle()).isEqualTo("Chapter 5 Review");
        assertThat(response.getSchoolId()).isEqualTo(schoolId);
        assertThat(response.getMaxPoints()).isEqualByComparingTo("10");
        assertThat(response.getMaterialsJson()).isEqualTo(materialsJson);
        verify(homeworkRepository).save(argThat(homework -> materialsJson.equals(homework.getMaterialsJson())));
    }

    @Test
    @DisplayName("createHomework should reject duplicate titles for the same school")
    void createHomeworkRejectsDuplicateTitle() {
        UUID schoolId = UUID.randomUUID();
        CreateHomeworkRequest request = CreateHomeworkRequest.builder()
                .schoolId(schoolId)
                .title("Chapter 5 Review")
                .materialsJson("[]")
                .build();

        School school = mock(School.class);
        when(schoolRepository.findById(schoolId)).thenReturn(Optional.of(school));
        when(homeworkRepository.existsByTitleAndSchoolId("Chapter 5 Review", schoolId)).thenReturn(true);

        assertThatThrownBy(() -> homeworkService.createHomework(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("already exists");

        verify(homeworkRepository, never()).save(any());
    }
}