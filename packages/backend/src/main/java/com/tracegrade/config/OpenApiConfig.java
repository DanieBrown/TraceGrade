package com.tracegrade.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "TraceGrade API",
                version = "0.1.0",
                description = "REST API for TraceGrade — AI-powered exam grading and teacher productivity platform. "
                        + "All protected endpoints require a JWT bearer token obtained via the authentication flow.",
                contact = @Contact(
                        name = "TraceGrade Team",
                        url = "https://github.com/DanieBrown/TraceGrade"
                )
        ),
        servers = {
                @Server(url = "http://localhost:8080", description = "Local development")
        }
)
@SecurityScheme(
        name = "BearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "JWT token obtained from the authentication endpoint. "
                + "Pass as: Authorization: Bearer <token>"
)
public class OpenApiConfig {
}
