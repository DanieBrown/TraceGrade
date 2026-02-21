#!/bin/bash
# Creates the SQS queues used by TraceGrade for async grading.
# This script runs automatically when LocalStack is ready.

QUEUE_NAME="${SQS_QUEUE_NAME:-tracegrade-grading-queue}"
DLQ_NAME="${SQS_DLQ_NAME:-tracegrade-grading-dlq}"
VISIBILITY_TIMEOUT="${SQS_VISIBILITY_TIMEOUT:-300}"
MAX_RECEIVE_COUNT="${SQS_MAX_RECEIVE_COUNT:-3}"

echo "Creating SQS Dead Letter Queue: $DLQ_NAME"
DLQ_URL=$(awslocal sqs create-queue \
  --queue-name "$DLQ_NAME" \
  --attributes VisibilityTimeout="$VISIBILITY_TIMEOUT" \
  --query 'QueueUrl' \
  --output text)

DLQ_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url "$DLQ_URL" \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text)

echo "DLQ URL: $DLQ_URL"
echo "DLQ ARN: $DLQ_ARN"

echo "Creating SQS grading queue: $QUEUE_NAME"
QUEUE_URL=$(awslocal sqs create-queue \
  --queue-name "$QUEUE_NAME" \
  --attributes \
    VisibilityTimeout="$VISIBILITY_TIMEOUT" \
    "RedrivePolicy={\"deadLetterTargetArn\":\"$DLQ_ARN\",\"maxReceiveCount\":\"$MAX_RECEIVE_COUNT\"}" \
  --query 'QueueUrl' \
  --output text)

echo "Queue URL: $QUEUE_URL"
echo "SQS queues '$QUEUE_NAME' and '$DLQ_NAME' configured with DLQ redrive policy (maxReceiveCount=$MAX_RECEIVE_COUNT)"
