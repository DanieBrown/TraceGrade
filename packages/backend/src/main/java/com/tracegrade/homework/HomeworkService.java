package com.tracegrade.homework;

import com.tracegrade.domain.model.Homework;
import com.tracegrade.domain.model.School;
import com.tracegrade.domain.repository.HomeworkRepository;
import com.tracegrade.domain.repository.SchoolRepository;
import com.tracegrade.dto.request.CreateHomeworkRequest;
import com.tracegrade.dto.response.HomeworkResponse;
import com.tracegrade.exception.DuplicateResourceException;
import com.tracegrade.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class HomeworkService {

    private final HomeworkRepository homeworkRepository;
    private final SchoolRepository schoolRepository;

    @Transactional(readOnly = true)
    public List<HomeworkResponse> getHomeworkBySchool(UUID schoolId) {
        requireSchoolExists(schoolId);
        return homeworkRepository.findBySchoolIdOrderByCreatedAtDesc(schoolId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public HomeworkResponse getHomework(UUID schoolId, UUID homeworkId) {
        return toResponse(findByIdAndSchool(schoolId, homeworkId));
    }

    @Transactional
    public HomeworkResponse createHomework(CreateHomeworkRequest request) {
        School school = schoolRepository.findById(request.getSchoolId())
                .orElseThrow(() -> new ResourceNotFoundException("School", request.getSchoolId()));

        if (homeworkRepository.existsByTitleAndSchoolId(request.getTitle(), request.getSchoolId())) {
            throw new DuplicateResourceException("Homework", "title", request.getTitle());
        }

        Homework homework = Homework.builder()
                .school(school)
                .title(request.getTitle())
                .description(request.getDescription())
                .className(request.getClassName())
                .dueDate(request.getDueDate())
                .maxPoints(request.getMaxPoints())
                .build();

        log.info("Creating homework: title={}, schoolId={}", request.getTitle(), request.getSchoolId());
        return toResponse(homeworkRepository.save(homework));
    }

    @Transactional
    public void deleteHomework(UUID schoolId, UUID homeworkId) {
        Homework homework = findByIdAndSchool(schoolId, homeworkId);
        log.info("Deleting homework {}", homeworkId);
        homeworkRepository.delete(homework);
    }

    // ---- helpers ----

    private Homework findByIdAndSchool(UUID schoolId, UUID homeworkId) {
        requireSchoolExists(schoolId);
        return homeworkRepository.findByIdAndSchoolId(homeworkId, schoolId)
                .orElseThrow(() -> new ResourceNotFoundException("Homework", homeworkId));
    }

    private void requireSchoolExists(UUID schoolId) {
        if (!schoolRepository.existsById(schoolId)) {
            throw new ResourceNotFoundException("School", schoolId);
        }
    }

    private HomeworkResponse toResponse(Homework h) {
        return HomeworkResponse.builder()
                .id(h.getId())
                .schoolId(h.getSchool().getId())
                .title(h.getTitle())
                .description(h.getDescription())
                .className(h.getClassName())
                .dueDate(h.getDueDate())
                .status(h.getStatus())
                .maxPoints(h.getMaxPoints())
                .createdAt(h.getCreatedAt())
                .updatedAt(h.getUpdatedAt())
                .build();
    }
}
