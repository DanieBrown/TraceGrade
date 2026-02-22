package com.tracegrade.dto.request;

import com.tracegrade.domain.model.SchoolType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateSchoolRequest {

    @NotBlank
    @Size(max = 200)
    private String name;

    @NotNull
    private SchoolType schoolType;

    @Size(max = 500)
    private String address;

    @Size(max = 20)
    private String phone;

    @Email
    @Size(max = 200)
    private String email;

    @Size(max = 100)
    private String timezone;
}
