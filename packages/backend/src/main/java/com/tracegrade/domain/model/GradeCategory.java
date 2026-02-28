package com.tracegrade.domain.model;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "grade_categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradeCategory extends BaseEntity {

    @Column(name = "class_id", nullable = false, updatable = false)
    private UUID classId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "weight", nullable = false, precision = 5, scale = 2)
    private BigDecimal weight;

    @Column(name = "drop_lowest", nullable = false)
    private Integer dropLowest;

    @Column(name = "color", length = 7)
    private String color;
}
