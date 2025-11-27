# DynamoDB Local Initialization Script for Windows (PowerShell)
# Run after docker-compose up: .\scripts\init-dynamodb.ps1

$ENDPOINT = "http://localhost:8000"
$REGION = "eu-central-1"

Write-Host "Creating DynamoDB tables for local development..." -ForegroundColor Cyan

# Create Transactions table
Write-Host "`nCreating Transactions table..." -ForegroundColor Yellow
try {
    aws dynamodb create-table `
        --table-name Transactions `
        --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=transactionId,AttributeType=S `
        --key-schema AttributeName=userId,KeyType=HASH AttributeName=transactionId,KeyType=RANGE `
        --billing-mode PAY_PER_REQUEST `
        --endpoint-url $ENDPOINT `
        --region $REGION `
        --no-cli-pager 2>$null
    Write-Host "✅ Transactions table created" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Transactions table already exists" -ForegroundColor Yellow
}

# Create Categories table
Write-Host "`nCreating Categories table..." -ForegroundColor Yellow
try {
    aws dynamodb create-table `
        --table-name Categories `
        --attribute-definitions AttributeName=userId,AttributeType=S AttributeName=categoryId,AttributeType=S `
        --key-schema AttributeName=userId,KeyType=HASH AttributeName=categoryId,KeyType=RANGE `
        --billing-mode PAY_PER_REQUEST `
        --endpoint-url $ENDPOINT `
        --region $REGION `
        --no-cli-pager 2>$null
    Write-Host "✅ Categories table created" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Categories table already exists" -ForegroundColor Yellow
}

# List tables
Write-Host "`nCurrent tables:" -ForegroundColor Cyan
aws dynamodb list-tables --endpoint-url $ENDPOINT --region $REGION --output table

Write-Host "`n✅ DynamoDB Local initialization complete!" -ForegroundColor Green
Write-Host "📍 Endpoint: $ENDPOINT" -ForegroundColor Cyan
