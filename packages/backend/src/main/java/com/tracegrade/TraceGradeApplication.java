package com.tracegrade;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

/**
 * Main application class for TraceGrade Backend
 *
 * TraceGrade is a modern teacher productivity and grade management platform
 * built with Java Spring Boot and React.
 */
@SpringBootApplication
@EnableCaching
public class TraceGradeApplication {

    public static void main(String[] args) {
        SpringApplication.run(TraceGradeApplication.class, args);
        System.out.println("""

            ╔════════════════════════════════════════╗
            ║                                        ║
            ║         TraceGrade Backend             ║
            ║    Teacher Productivity Platform       ║
            ║                                        ║
            ╚════════════════════════════════════════╝

            ✓ Application started successfully
            ✓ API Documentation: /actuator
            ✓ Health Check: /actuator/health

            """);
    }
}
