package com.tracegrade.sqs;

import java.util.List;
import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tracegrade.grading.GradingService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest;
import software.amazon.awssdk.services.sqs.model.Message;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;

/**
 * SQS consumer that polls the grading queue, processes each grading job by
 * delegating to {@link GradingService#grade}, and deletes the message on success.
 *
 * <p>Only active when {@code sqs.enabled=true}. Failed messages are left
 * in-flight so SQS visibility timeout expires and the message is retried.
 * After {@code sqs.max-receive-count} failed attempts the message is moved to
 * the configured dead-letter queue automatically by SQS.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "sqs.enabled", havingValue = "true")
@RequiredArgsConstructor
public class GradingWorker {

    private final SqsClient sqsClient;
    private final SqsProperties sqsProperties;
    private final GradingService gradingService;
    private final ObjectMapper objectMapper;

    /**
     * Polls for up to {@code sqs.max-messages-per-poll} messages using SQS long
     * polling, then processes each one. The fixed delay starts after the previous
     * poll (including the long-poll wait) completes, preventing overlapping cycles.
     */
    @Scheduled(fixedDelayString = "${sqs.polling-interval-ms:1000}")
    public void pollAndProcess() {
        List<Message> messages;
        try {
            ReceiveMessageRequest request = ReceiveMessageRequest.builder()
                    .queueUrl(sqsProperties.getQueueUrl())
                    .maxNumberOfMessages(sqsProperties.getMaxMessagesPerPoll())
                    .waitTimeSeconds(sqsProperties.getWaitTimeSeconds())
                    .visibilityTimeout(sqsProperties.getVisibilityTimeoutSeconds())
                    .build();

            messages = sqsClient.receiveMessage(request).messages();
        } catch (Exception e) {
            log.error("Failed to receive messages from SQS — will retry on next poll cycle", e);
            return;
        }

        if (!messages.isEmpty()) {
            log.debug("Received {} grading job(s) from SQS", messages.size());
        }

        for (Message message : messages) {
            processMessage(message);
        }
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    private void processMessage(Message message) {
        GradingJobMessage job;
        try {
            job = objectMapper.readValue(message.body(), GradingJobMessage.class);
        } catch (JsonProcessingException e) {
            log.error("Unreadable SQS message [id={}] — deleting to prevent DLQ loop: {}",
                    message.messageId(), message.body(), e);
            deleteMessage(message.receiptHandle());
            return;
        }

        UUID submissionId = job.getSubmissionId();
        log.info("Processing grading job [submissionId={}, messageId={}]",
                submissionId, message.messageId());

        try {
            gradingService.grade(submissionId);
            deleteMessage(message.receiptHandle());
            log.info("Grading complete [submissionId={}]", submissionId);
        } catch (Exception e) {
            log.error("Grading failed [submissionId={}, messageId={}] — message will be retried",
                    submissionId, message.messageId(), e);
            // Intentionally not deleting: visibility timeout expires → SQS re-enqueues.
            // After maxReceiveCount attempts the message moves to the DLQ.
        }
    }

    private void deleteMessage(String receiptHandle) {
        sqsClient.deleteMessage(DeleteMessageRequest.builder()
                .queueUrl(sqsProperties.getQueueUrl())
                .receiptHandle(receiptHandle)
                .build());
    }
}
