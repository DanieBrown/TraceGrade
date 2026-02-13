package com.tracegrade.domain.model;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "answer_rubrics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnswerRubric extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_template_id", nullable = false)
    private ExamTemplate examTemplate;

    @NotNull
    @Positive
    @Column(name = "question_number", nullable = false)
    private Integer questionNumber;

    @Column(name = "answer_text", columnDefinition = "TEXT")
    private String answerText;

    @Column(name = "answer_image_url", length = 500)
    private String answerImageUrl;

    @NotNull
    @Positive
    @Column(name = "points_available", nullable = false, precision = 10, scale = 2)
    private BigDecimal pointsAvailable;

    @Column(name = "acceptable_variations", columnDefinition = "TEXT")
    private String acceptableVariations;

    @Column(name = "grading_notes", columnDefinition = "TEXT")
    private String gradingNotes;
}
