package com.tracegrade.monitoring;

import java.net.URI;
import java.time.Duration;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

import io.micrometer.cloudwatch2.CloudWatchConfig;
import io.micrometer.cloudwatch2.CloudWatchMeterRegistry;
import io.micrometer.core.instrument.Clock;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cloudwatch.CloudWatchAsyncClient;
import software.amazon.awssdk.services.cloudwatch.CloudWatchAsyncClientBuilder;

/**
 * Configures CloudWatch metrics export when {@code cloudwatch.enabled=true}.
 *
 * <p>The resulting {@link CloudWatchMeterRegistry} is automatically picked up
 * by Spring Boot Actuator's composite registry, so all Micrometer meters
 * (including those recorded by {@link GradingMetricsService}) are published
 * to AWS CloudWatch on each step interval.
 *
 * <p>Set {@code cloudwatch.endpoint} to {@code http://localstack:4566} for
 * local development with LocalStack.
 */
@Configuration
@ConditionalOnProperty(name = "cloudwatch.enabled", havingValue = "true")
public class CloudWatchMetricsConfig {

    @Bean
    public CloudWatchAsyncClient cloudWatchAsyncClient(CloudWatchProperties properties) {
        CloudWatchAsyncClientBuilder builder = CloudWatchAsyncClient.builder()
                .region(Region.of(properties.getRegion()))
                .credentialsProvider(DefaultCredentialsProvider.create());

        if (StringUtils.hasText(properties.getEndpoint())) {
            builder.endpointOverride(URI.create(properties.getEndpoint()));
        }

        return builder.build();
    }

    @Bean
    public CloudWatchMeterRegistry cloudWatchMeterRegistry(
            CloudWatchProperties properties,
            CloudWatchAsyncClient cloudWatchAsyncClient) {

        CloudWatchConfig config = new CloudWatchConfig() {
            @Override
            public String get(String key) {
                return null;
            }

            @Override
            public String namespace() {
                return properties.getNamespace();
            }

            @Override
            public Duration step() {
                return Duration.ofSeconds(properties.getStepSeconds());
            }
        };

        return new CloudWatchMeterRegistry(config, Clock.SYSTEM, cloudWatchAsyncClient);
    }
}
