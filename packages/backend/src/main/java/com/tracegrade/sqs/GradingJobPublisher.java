package com.tracegrade.sqs;

import java.time.Instant;
import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.SendMessageRequest;
import software.amazon.awssdk.services.sqs.model.SendMessageResponse;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "sqs.enabled", havingValue = "true")
public class GradingJobPublisher {

    private final SqsClient sqsClient;
    private final SqsProperties sqsProperties;
    private final ObjectMapper objectMapper;

    /**
     * Publishes a grading job to the SQS queue for async processing.
     *
     * @param submissionId the UUID of the StudentSubmission to grade
     */
    public void publishGradingJob(UUID submissionId) {
        GradingJobMessage message = GradingJobMessage.builder()
                .submissionId(submissionId)
                .enqueuedAt(Instant.now())
                .build();

        String messageBody;
        try {
            messageBody = objectMapper.writeValueAsString(message);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(
                    "Failed to serialize GradingJobMessage for submissionId=" + submissionId, e);
        }

        SendMessageResponse response = sqsClient.sendMessage(SendMessageRequest.builder()
                .queueUrl(sqsProperties.getQueueUrl())
                .messageBody(messageBody)
                .build());

        log.info("Published grading job to SQS for submissionId={} messageId={}",
                submissionId, response.messageId());
    }
}
