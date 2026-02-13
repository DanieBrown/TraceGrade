package com.tracegrade.domain.model;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "exam_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamTemplate extends BaseEntity {

    @NotNull
    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;

    @Column(name = "assignment_id")
    private UUID assignmentId;

    @NotBlank
    @Size(max = 200)
    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Size(max = 100)
    @Column(name = "subject", length = 100)
    private String subject;

    @Size(max = 200)
    @Column(name = "topic", length = 200)
    private String topic;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty_level", length = 20)
    private DifficultyLevel difficultyLevel;

    @NotNull
    @Positive
    @Column(name = "total_points", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalPoints;

    @NotBlank
    @Column(name = "questions_json", nullable = false, columnDefinition = "TEXT")
    private String questionsJson;

    @Column(name = "pdf_url", length = 500)
    private String pdfUrl;

    @Column(name = "generation_prompt", columnDefinition = "TEXT")
    private String generationPrompt;

    @OneToMany(mappedBy = "examTemplate", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<AnswerRubric> answerRubrics = new ArrayList<>();

    @OneToMany(mappedBy = "examTemplate")
    @Builder.Default
    private List<StudentSubmission> submissions = new ArrayList<>();
}
