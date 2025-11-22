#!/bin/bash
# Initialize DynamoDB Local tables for development
# Run after docker-compose up: ./scripts/init-dynamodb.sh

ENDPOINT="http://localhost:8000"
REGION="eu-north-1"

echo "Creating DynamoDB tables for local development..."

# Create Transactions table
aws dynamodb create-table \
    --table-name Transactions \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=transactionId,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
        AttributeName=transactionId,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url $ENDPOINT \
    --region $REGION \
    2>/dev/null && echo "✅ Transactions table created" || echo "⚠️  Transactions table already exists"

# Create Categories table
aws dynamodb create-table \
    --table-name Categories \
    --attribute-definitions \
        AttributeName=userId,AttributeType=S \
        AttributeName=categoryId,AttributeType=S \
    --key-schema \
        AttributeName=userId,KeyType=HASH \
        AttributeName=categoryId,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url $ENDPOINT \
    --region $REGION \
    2>/dev/null && echo "✅ Categories table created" || echo "⚠️  Categories table already exists"

# List tables
echo ""
echo "Current tables:"
aws dynamodb list-tables --endpoint-url $ENDPOINT --region $REGION --output table

echo ""
echo "✅ DynamoDB Local initialization complete!"
echo "📍 Endpoint: $ENDPOINT"
