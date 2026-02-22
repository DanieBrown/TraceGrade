package com.tracegrade.dto.response;

import com.tracegrade.domain.model.SchoolType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchoolResponse {

    private UUID id;
    private String name;
    private SchoolType schoolType;
    private String address;
    private String phone;
    private String email;
    private String timezone;
    private Boolean isActive;
    private Instant createdAt;
    private Instant updatedAt;
}
