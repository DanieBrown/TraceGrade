#!/bin/bash
# Creates the S3 bucket used by TraceGrade for exam/submission storage.
# This script runs automatically when LocalStack is ready.

BUCKET_NAME="${S3_BUCKET_NAME:-tracegrade-exams-dev}"

echo "Creating S3 bucket: $BUCKET_NAME"
awslocal s3 mb "s3://$BUCKET_NAME"

# Enable versioning
awslocal s3api put-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --versioning-configuration Status=Enabled

# Configure server-side encryption (AES-256)
awslocal s3api put-bucket-encryption \
  --bucket "$BUCKET_NAME" \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        },
        "BucketKeyEnabled": true
      }
    ]
  }'

# Configure lifecycle policy (90-day expiration for dev)
awslocal s3api put-bucket-lifecycle-configuration \
  --bucket "$BUCKET_NAME" \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "ExpireOldFiles",
        "Status": "Enabled",
        "Filter": { "Prefix": "" },
        "Expiration": { "Days": 90 }
      }
    ]
  }'

# Configure CORS for frontend uploads
awslocal s3api put-bucket-cors \
  --bucket "$BUCKET_NAME" \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedOrigins": ["http://localhost:5173", "http://localhost:3000"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3600
      }
    ]
  }'

echo "S3 bucket '$BUCKET_NAME' configured with versioning, encryption, lifecycle, and CORS"
