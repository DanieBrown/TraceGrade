package com.tracegrade.sqs;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.assertArg;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tracegrade.grading.GradingService;

import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.model.DeleteMessageRequest;
import software.amazon.awssdk.services.sqs.model.Message;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageRequest;
import software.amazon.awssdk.services.sqs.model.ReceiveMessageResponse;

import static org.assertj.core.api.Assertions.assertThatCode;

@SuppressWarnings("null")
class GradingWorkerTest {

    private static final String QUEUE_URL     = "https://sqs.us-east-1.amazonaws.com/123/grading-queue";
    private static final UUID   SUBMISSION_ID = UUID.randomUUID();

    private SqsClient      sqsClient;
    private SqsProperties  sqsProperties;
    private GradingService gradingService;
    private GradingWorker  worker;

    @BeforeEach
    void setUp() {
        sqsClient      = mock(SqsClient.class);
        gradingService = mock(GradingService.class);
        sqsProperties  = new SqsProperties();
        sqsProperties.setEnabled(true);
        sqsProperties.setQueueUrl(QUEUE_URL);
        sqsProperties.setVisibilityTimeoutSeconds(300);
        sqsProperties.setWaitTimeSeconds(20);
        sqsProperties.setMaxMessagesPerPoll(10);

        worker = new GradingWorker(sqsClient, sqsProperties, gradingService, new ObjectMapper());
    }

    // -------------------------------------------------------------------------
    // Polling
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("pollAndProcess")
    class PollAndProcess {

        @Test
        @DisplayName("sends correct ReceiveMessageRequest to SQS")
        void sendsCorrectReceiveRequest() {
            when(sqsClient.receiveMessage(any(ReceiveMessageRequest.class)))
                    .thenReturn(ReceiveMessageResponse.builder().messages(List.of()).build());

            worker.pollAndProcess();

            verify(sqsClient).receiveMessage(assertArg((ReceiveMessageRequest req) -> {
                org.assertj.core.api.Assertions.assertThat(req.queueUrl()).isEqualTo(QUEUE_URL);
                org.assertj.core.api.Assertions.assertThat(req.maxNumberOfMessages()).isEqualTo(10);
                org.assertj.core.api.Assertions.assertThat(req.waitTimeSeconds()).isEqualTo(20);
                org.assertj.core.api.Assertions.assertThat(req.visibilityTimeout()).isEqualTo(300);
            }));
        }

        @Test
        @DisplayName("does nothing when queue is empty")
        void doesNothingWhenQueueEmpty() {
            when(sqsClient.receiveMessage(any(ReceiveMessageRequest.class)))
                    .thenReturn(ReceiveMessageResponse.builder().messages(List.of()).build());

            worker.pollAndProcess();

            verify(gradingService, never()).grade(any());
            verify(sqsClient, never()).deleteMessage(any(DeleteMessageRequest.class));
        }

        @Test
        @DisplayName("processes multiple messages in a single poll cycle")
        void processesMultipleMessages() throws Exception {
            UUID id1 = UUID.randomUUID();
            UUID id2 = UUID.randomUUID();

            when(sqsClient.receiveMessage(any(ReceiveMessageRequest.class)))
                    .thenReturn(ReceiveMessageResponse.builder()
                            .messages(buildMessage(id1, "receipt-1"), buildMessage(id2, "receipt-2"))
                            .build());

            worker.pollAndProcess();

            verify(gradingService, times(1)).grade(id1);
            verify(gradingService, times(1)).grade(id2);
            verify(sqsClient, times(2)).deleteMessage(any(DeleteMessageRequest.class));
        }
    }

    // -------------------------------------------------------------------------
    // Success path
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("successful grading")
    class SuccessPath {

        @Test
        @DisplayName("calls GradingService.grade with the correct submissionId")
        void callsGradeWithCorrectId() throws Exception {
            when(sqsClient.receiveMessage(any(ReceiveMessageRequest.class)))
                    .thenReturn(ReceiveMessageResponse.builder()
                            .messages(buildMessage(SUBMISSION_ID, "receipt-ok"))
                            .build());

            worker.pollAndProcess();

            verify(gradingService).grade(SUBMISSION_ID);
        }

        @Test
        @DisplayName("deletes message from SQS after successful grading")
        void deletesMessageAfterSuccess() throws Exception {
            when(sqsClient.receiveMessage(any(ReceiveMessageRequest.class)))
                    .thenReturn(ReceiveMessageResponse.builder()
                            .messages(buildMessage(SUBMISSION_ID, "receipt-to-delete"))
                            .build());

            worker.pollAndProcess();

            verify(sqsClient).deleteMessage(assertArg((DeleteMessageRequest req) -> {
                org.assertj.core.api.Assertions.assertThat(req.queueUrl()).isEqualTo(QUEUE_URL);
                org.assertj.core.api.Assertions.assertThat(req.receiptHandle()).isEqualTo("receipt-to-delete");
            }));
        }
    }

    // -------------------------------------------------------------------------
    // Failure paths
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("grading failure")
    class FailurePaths {

        @Test
        @DisplayName("does not delete message when GradingService throws — allows SQS retry")
        void doesNotDeleteOnGradingError() throws Exception {
            when(sqsClient.receiveMessage(any(ReceiveMessageRequest.class)))
                    .thenReturn(ReceiveMessageResponse.builder()
                            .messages(buildMessage(SUBMISSION_ID, "receipt-retry"))
                            .build());
            when(gradingService.grade(SUBMISSION_ID))
                    .thenThrow(new RuntimeException("OpenAI timeout"));

            worker.pollAndProcess();

            verify(sqsClient, never()).deleteMessage(any(DeleteMessageRequest.class));
        }

        @Test
        @DisplayName("continues processing remaining messages after one failure")
        void continuesAfterOneFailure() throws Exception {
            UUID failId    = UUID.randomUUID();
            UUID successId = UUID.randomUUID();

            when(sqsClient.receiveMessage(any(ReceiveMessageRequest.class)))
                    .thenReturn(ReceiveMessageResponse.builder()
                            .messages(buildMessage(failId, "receipt-fail"),
                                      buildMessage(successId, "receipt-ok"))
                            .build());
            when(gradingService.grade(failId)).thenThrow(new RuntimeException("AI error"));

            worker.pollAndProcess();

            verify(gradingService).grade(failId);
            verify(gradingService).grade(successId);
            // Only the successful message is deleted
            verify(sqsClient, times(1)).deleteMessage(assertArg((DeleteMessageRequest req) ->
                    org.assertj.core.api.Assertions.assertThat(req.receiptHandle()).isEqualTo("receipt-ok")));
        }

        @Test
        @DisplayName("deletes unreadable (poison-pill) message to prevent DLQ loop")
        void deletesPoisonPillMessage() {
            Message badMessage = Message.builder()
                    .messageId("bad-msg-id")
                    .receiptHandle("receipt-bad")
                    .body("{not valid json}")
                    .build();

            when(sqsClient.receiveMessage(any(ReceiveMessageRequest.class)))
                    .thenReturn(ReceiveMessageResponse.builder().messages(badMessage).build());

            worker.pollAndProcess();

            // Poison pill is deleted; grading is never attempted
            verify(gradingService, never()).grade(any());
            verify(sqsClient).deleteMessage(assertArg((DeleteMessageRequest req) ->
                    org.assertj.core.api.Assertions.assertThat(req.receiptHandle()).isEqualTo("receipt-bad")));
        }

        @Test
        @DisplayName("pollAndProcess does not propagate exceptions thrown by SQS client")
        void doesNotPropagateReceiveException() {
            when(sqsClient.receiveMessage(any(ReceiveMessageRequest.class)))
                    .thenThrow(new RuntimeException("SQS unavailable"));

            assertThatCode(() -> worker.pollAndProcess()).doesNotThrowAnyException();
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Message buildMessage(UUID submissionId, String receiptHandle) throws Exception {
        GradingJobMessage job = GradingJobMessage.builder()
                .submissionId(submissionId)
                .enqueuedAt(Instant.now())
                .build();
        String body = new ObjectMapper().writeValueAsString(job);
        return Message.builder()
                .messageId(UUID.randomUUID().toString())
                .receiptHandle(receiptHandle)
                .body(body)
                .build();
    }
}
