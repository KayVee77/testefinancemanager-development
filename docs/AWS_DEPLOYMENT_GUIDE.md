# AWS Deployment Guide
**FinanceFlow Personal Finance Manager**

## Overview

This guide covers deploying the FinanceFlow application to AWS with two distinct environments:

1. **LOCAL TEST** - Development environment for testing without AWS
2. **PROD AWS** - Production environment with full AWS infrastructure

**Deployment Strategy:** AWS SAM (Serverless Application Model) for Infrastructure-as-Code

**Region:** eu-north-1 (Stockholm, Sweden - closest to Lithuania with full service availability)

---

## Architecture

### Local Test Environment
```
Browser
  ├── React App (Vite dev server)
  ├── localStorage (plain JSON)
  └── Dev Auth (PBKDF2 hashing)
```

### Production AWS Environment
```
Browser
  ├── React App (S3 + CloudFront)
  └── AWS Amplify SDK
       │
       ├── AWS Cognito (Authentication)
       ├── API Gateway (REST API)
       ├── Lambda Functions (Business Logic)
       │    └── DynamoDB (Data Storage + KMS Encryption)
       └── CloudWatch (Monitoring & Logs)
```

---

## Prerequisites

### Required
- AWS Account with billing enabled
- AWS CLI installed and configured
- Node.js 18+ and npm
- Git repository

### AWS Services Used
- **Cognito** - User authentication and authorization
- **API Gateway** - RESTful API endpoints with rate limiting
- **Lambda** - Serverless functions for business logic
- **DynamoDB** - NoSQL database for transactions/categories
- **S3** - Static website hosting
- **CloudFront** - CDN for fast global access
- **KMS** - Encryption key management
- **CloudWatch** - Logging and monitoring (server-side only)
- **IAM** - Access control and permissions
- **SAM** - Infrastructure-as-Code deployment

**SECURITY NOTE:** Never call AWS SDK (CloudWatch, DynamoDB, etc.) directly from browser. All AWS service calls must go through API Gateway + Lambda for proper security, authentication, and PII scrubbing.

---

## Phase 1: Local Development Setup

### 1.1 Environment Configuration

Create `.env` file for local development:
```bash
# .env (local development)
VITE_DEV_ONLY_AUTH=true
VITE_ENVIRONMENT=local
```

Create `.env.example` template (commit to git):
```bash
# .env.example
# Environment Configuration

# Authentication Mode
# Set to 'true' for local dev, 'false' for AWS Cognito
VITE_DEV_ONLY_AUTH=true

# Environment
VITE_ENVIRONMENT=local

# AWS Configuration (for production)
# VITE_AWS_REGION=eu-central-1
# VITE_AWS_COGNITO_USER_POOL_ID=
# VITE_AWS_COGNITO_CLIENT_ID=
# VITE_API_GATEWAY_URL=
```

Update `.gitignore`:
```bash
# Environment variables
.env
.env.local
.env.production

# AWS
.amplify/
amplify/
aws-exports.js
```

### 1.2 Install Dependencies

```bash
# Production dependencies
npm install

# AWS SDK (for future AWS deployment)
npm install aws-amplify @aws-amplify/ui-react

# Development tools
npm install -D @playwright/test
npx playwright install
```

### 1.3 Run Local Development

```bash
# Start dev server
npm run dev

# In another terminal, run tests
npx playwright test

# Build for production (test)
npm run build
npm run preview
```

---

## Phase 2: AWS Account Setup

### 2.1 Create AWS Account

1. Go to https://aws.amazon.com
2. Create account (requires credit card)
3. Verify email and phone
4. Choose support plan (Basic is free)

### 2.2 Install AWS CLI

**Windows:**
```powershell
# Download and install AWS CLI
# https://awscli.amazonaws.com/AWSCLIV2.msi
```

**macOS:**
```bash
brew install awscli
```

**Linux:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### 2.3 Configure AWS CLI

```bash
# Configure credentials
aws configure

# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region: eu-central-1 (Frankfurt, EU)
# - Default output format: json
```

### 2.4 Create IAM User for Deployment

```bash
# Create IAM user
aws iam create-user --user-name financeflow-deployer

# Attach policies
aws iam attach-user-policy \
  --user-name financeflow-deployer \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Create access keys
aws iam create-access-key --user-name financeflow-deployer
```

Save the access key ID and secret access key securely.

---

## Phase 3: Set Up AWS Backend with SAM

### 3.1 Install AWS SAM CLI

**Windows:**
```powershell
# Download SAM CLI installer
# https://github.com/aws/aws-sam-cli/releases/latest/download/AWS_SAM_CLI_64_PY3.msi

# Or use Chocolatey
choco install aws-sam-cli

# Verify installation
sam --version
```

**macOS:**
```bash
brew install aws-sam-cli
```

**Linux:**
```bash
# Download and install
wget https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip
unzip aws-sam-cli-linux-x86_64.zip -d sam-installation
sudo ./sam-installation/install
```

### 3.2 Initialize SAM Project

```bash
# Create SAM directory
mkdir aws-infrastructure
cd aws-infrastructure

# Initialize SAM project
sam init

# Choose:
# - AWS Quick Start Templates
# - Serverless API
# - Runtime: nodejs18.x
# - Project name: financeflow-backend
```

### 3.3 Create SAM Template

Create `aws-infrastructure/template.yaml`:

---

## Phase 4: Update Frontend for AWS

### 4.1 Configure Amplify in App

Create `src/aws-config.ts`:
```typescript
import { Amplify } from 'aws-amplify';

// Check if running in AWS mode
const IS_AWS_MODE = import.meta.env.VITE_DEV_ONLY_AUTH === 'false';

if (IS_AWS_MODE) {
  // Load AWS configuration
  const awsConfig = {
    Auth: {
      region: import.meta.env.VITE_AWS_REGION,
      userPoolId: import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID,
      userPoolWebClientId: import.meta.env.VITE_AWS_COGNITO_CLIENT_ID,
    },
    API: {
      endpoints: [
        {
          name: 'financeflow',
          endpoint: import.meta.env.VITE_API_GATEWAY_URL,
          region: import.meta.env.VITE_AWS_REGION
        }
      ]
    }
  };
  
  Amplify.configure(awsConfig);
}

export { IS_AWS_MODE };
```

Update `src/main.tsx`:
```typescript
import './aws-config'; // Import before React
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### 4.2 Create API Service Layer

Create `src/services/api.ts`:
```typescript
import { API, Auth } from 'aws-amplify';
import { IS_AWS_MODE } from '../aws-config';
import * as localStorage from '../utils/storage'; // Fallback

export const apiService = {
  async getTransactions(): Promise<Transaction[]> {
    if (IS_AWS_MODE) {
      return await API.get('financeflow', '/transactions', {});
    }
    return localStorage.getStoredTransactions(getCurrentUserId());
  },
  
  async createTransaction(transaction: Transaction): Promise<Transaction> {
    if (IS_AWS_MODE) {
      return await API.post('financeflow', '/transactions', {
        body: transaction
      });
    }
    localStorage.saveTransaction(getCurrentUserId(), transaction);
    return transaction;
  },
  
  async updateTransaction(transaction: Transaction): Promise<Transaction> {
    if (IS_AWS_MODE) {
      return await API.put('financeflow', `/transactions/${transaction.id}`, {
        body: transaction
      });
    }
    localStorage.updateTransaction(getCurrentUserId(), transaction);
    return transaction;
  },
  
  async deleteTransaction(id: string): Promise<void> {
    if (IS_AWS_MODE) {
      await API.del('financeflow', `/transactions/${id}`, {});
    } else {
      localStorage.deleteTransaction(getCurrentUserId(), id);
    }
  }
};

function getCurrentUserId(): string {
  const user = JSON.parse(localStorage.getItem('finance_current_user') || '{}');
  return user.id;
}
```

### 4.3 Update Components to Use API Service

Update `src/components/TransactionForm.tsx`:
```typescript
import { apiService } from '../services/api';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    await apiService.createTransaction(newTransaction);
    setSuccess(true);
  } catch (error) {
    console.error('Failed to create transaction:', error);
    setError('Nepavyko sukurti transakcijos');
  }
};
```

### 4.4 Create Production Environment File

Create `.env.production`:
```bash
# Production AWS Environment
VITE_DEV_ONLY_AUTH=false
VITE_ENVIRONMENT=production
VITE_AWS_REGION=eu-central-1
VITE_AWS_COGNITO_USER_POOL_ID=eu-central-1_XXXXXXXXX
VITE_AWS_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_API_GATEWAY_URL=https://xxxxxxxxxx.execute-api.eu-central-1.amazonaws.com/prod
```

---

## Phase 5: Deploy Frontend to AWS

### 5.1 Add Hosting with Amplify

```bash
# Add hosting
amplify add hosting

# Choose:
# - Hosting with Amplify Console (Managed hosting)
# - Continuous deployment? Yes
```

### 5.2 Or Deploy to S3 + CloudFront Manually

#### Create S3 Bucket
```bash
# Create bucket
aws s3 mb s3://financeflow-prod --region eu-central-1

# Enable static website hosting
aws s3 website s3://financeflow-prod \
  --index-document index.html \
  --error-document index.html
```

#### Build and Upload
```bash
# Build production bundle
npm run build

# Upload to S3
aws s3 sync dist/ s3://financeflow-prod \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html"

# Upload index.html separately (no cache)
aws s3 cp dist/index.html s3://financeflow-prod/index.html \
  --cache-control "public,max-age=0,must-revalidate"
```

#### Create CloudFront Distribution
```bash
# Create distribution (via AWS Console or CLI)
aws cloudfront create-distribution \
  --origin-domain-name financeflow-prod.s3.eu-central-1.amazonaws.com \
  --default-root-object index.html
```

### 5.3 Configure Custom Domain (Optional)

```bash
# Register domain in Route 53
aws route53 create-hosted-zone --name financeflow.com

# Request SSL certificate
aws acm request-certificate \
  --domain-name financeflow.com \
  --validation-method DNS \
  --region us-east-1

# Update CloudFront to use custom domain
# (via AWS Console)
```

---

## Phase 6: Testing & Monitoring

### 6.1 Test Production Deployment

```bash
# Test authentication
curl -X POST https://your-api.execute-api.eu-central-1.amazonaws.com/prod/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'

# Test API (with Cognito token)
curl https://your-api.execute-api.eu-central-1.amazonaws.com/prod/transactions \
  -H "Authorization: Bearer $COGNITO_TOKEN"
```

### 6.2 Set Up CloudWatch Monitoring

```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name FinanceFlowProd \
  --dashboard-body file://cloudwatch-dashboard.json
```

### 6.3 Enable Logging

```bash
# Enable API Gateway logging
aws apigatewayv2 update-stage \
  --api-id $API_ID \
  --stage-name prod \
  --access-log-settings file://api-logging.json

# Enable Lambda logging (automatic with CloudWatch)
```

---

## Cost Estimation

### Free Tier (First 12 Months)
- **Cognito**: 50,000 MAUs free
- **API Gateway**: 1M API calls free
- **Lambda**: 1M requests + 400,000 GB-seconds free
- **DynamoDB**: 25 GB storage + 25 WCU + 25 RCU free
- **S3**: 5 GB storage + 20,000 GET + 2,000 PUT free
- **CloudFront**: 1 TB data transfer out free

### After Free Tier (Estimated Monthly)
- **Cognito**: $0.0055 per MAU (after 50,000)
- **API Gateway**: $3.50 per million requests
- **Lambda**: $0.20 per 1M requests + compute time
- **DynamoDB**: $0.25 per GB + $0.25 per million read/write units
- **S3**: $0.023 per GB + data transfer
- **CloudFront**: $0.085 per GB data transfer

**Estimated cost for 1,000 users:** $5-20/month  
**Estimated cost for 10,000 users:** $50-150/month

---

## Environment Comparison

| Feature | Local Test | Prod AWS |
|---------|-----------|----------|
| **Authentication** | Dev PBKDF2 | AWS Cognito |
| **Data Storage** | localStorage | DynamoDB + KMS |
| **API** | Direct functions | API Gateway + Lambda |
| **Hosting** | Vite dev server | S3 + CloudFront |
| **Encryption** | None (plain JSON) | KMS encryption at rest |
| **Scalability** | Single browser | Auto-scaling |
| **Cost** | $0 | ~$5-20/month |
| **Use Case** | Development | Production |

---

## Troubleshooting

### Issue: Cognito 400 Bad Request
**Solution:** Check User Pool settings, verify email/password requirements match schema

### Issue: API Gateway 403 Forbidden
**Solution:** Verify Cognito token is valid, check IAM permissions for Lambda

### Issue: DynamoDB Access Denied
**Solution:** Update Lambda execution role to include DynamoDB permissions

### Issue: CORS Errors
**Solution:** Add CORS headers to API Gateway and Lambda responses

### Issue: CloudFront Cache Not Updating
**Solution:** Create invalidation: `aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"`

---

## Security Best Practices

1. **Enable MFA** on AWS root account
2. **Use IAM roles** instead of access keys where possible
3. **Rotate credentials** regularly
4. **Enable CloudTrail** for audit logging
5. **Use AWS Secrets Manager** for sensitive configuration
6. **Enable AWS WAF** for API Gateway (DDoS protection)
7. **Set up budget alerts** to avoid unexpected charges
8. **Enable DynamoDB backups** (point-in-time recovery)
9. **Use least-privilege IAM policies**
10. **Enable VPC** for Lambda functions (optional, for advanced security)

---

## Maintenance

### Updating the Application
```bash
# Local development
git pull
npm install
npm run dev

# Deploy to AWS
npm run build
amplify publish
# or
aws s3 sync dist/ s3://financeflow-prod --delete
```

### Monitoring Performance
```bash
# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --start-time 2025-01-01T00:00:00Z \
  --end-time 2025-01-08T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

### Database Backups
```bash
# Enable point-in-time recovery
aws dynamodb update-continuous-backups \
  --table-name financeflow-transactions-prod \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

---

## Next Steps

After successful AWS deployment:

1. **Set up CI/CD** with GitHub Actions or AWS CodePipeline
2. **Add monitoring alerts** for errors and performance
3. **Implement analytics** with AWS Pinpoint or Google Analytics
4. **Add user feedback** mechanism
5. **Optimize performance** with CloudFront caching
6. **Plan for scaling** as user base grows

---

## Support Resources

- **AWS Documentation**: https://docs.aws.amazon.com
- **Amplify Docs**: https://docs.amplify.aws
- **Cognito Docs**: https://docs.aws.amazon.com/cognito
- **DynamoDB Docs**: https://docs.aws.amazon.com/dynamodb
- **AWS Support**: https://console.aws.amazon.com/support

---

**Last Updated:** 2025-11-08  
**Version:** 1.0.0  
**Status:** Ready for deployment
