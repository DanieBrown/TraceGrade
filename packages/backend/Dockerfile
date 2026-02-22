# ===========================
# Multi-stage Dockerfile for Spring Boot Backend
# ===========================

# Stage 1: Build
FROM maven:3.9-eclipse-temurin-21-alpine AS build

WORKDIR /app

# Copy dependency files first for better caching
COPY pom.xml .

# Download dependencies
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build the application (skip tests for faster builds, run tests in CI)
RUN mvn clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Create non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring

# Copy the built JAR from build stage
COPY --from=build /app/target/*.jar app.jar

# Create logs directory
RUN mkdir -p /app/logs && chown -R spring:spring /app

# Switch to non-root user
USER spring:spring

# Expose application port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# JVM options for containerized environment
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC"

# Run the application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
