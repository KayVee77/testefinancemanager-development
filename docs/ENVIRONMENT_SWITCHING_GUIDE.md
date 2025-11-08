# Environment Switching Guide
**FinanceFlow - Quick Reference**

## Overview

FinanceFlow supports two environments:
- **LOCAL TEST** - Development with localStorage
- **PROD AWS** - Production with AWS services

---

## Environment Files

### Local Development
**File:** `.env`
```bash
VITE_DEV_ONLY_AUTH=true
VITE_ENVIRONMENT=local
```

### Production AWS
**File:** `.env.production`
```bash
VITE_DEV_ONLY_AUTH=false
VITE_ENVIRONMENT=production
VITE_AWS_REGION=eu-central-1
VITE_AWS_COGNITO_USER_POOL_ID=eu-central-1_XXXXXXXXX
VITE_AWS_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_API_GATEWAY_URL=https://xxxxxxxxxx.execute-api.eu-central-1.amazonaws.com/prod
```

---

## Switching Environments

### Run in LOCAL TEST mode
```bash
# Create/update .env file
echo "VITE_DEV_ONLY_AUTH=true" > .env

# Start dev server
npm run dev

# Open browser
# http://localhost:5173
```

**What happens:**
- ✅ Uses dev authentication (PBKDF2)
- ✅ Stores data in localStorage
- ✅ No AWS services required
- ✅ Perfect for development and testing
- ✅ Console shows: `[AUTH] Using dev authentication (local only)`

### Run in PROD AWS mode (locally)
```bash
# Update .env file
echo "VITE_DEV_ONLY_AUTH=false" > .env
echo "VITE_AWS_REGION=eu-central-1" >> .env
echo "VITE_AWS_COGNITO_USER_POOL_ID=your-pool-id" >> .env
echo "VITE_AWS_COGNITO_CLIENT_ID=your-client-id" >> .env
echo "VITE_API_GATEWAY_URL=your-api-url" >> .env

# Start dev server
npm run dev
```

**What happens:**
- ✅ Uses AWS Cognito for authentication
- ✅ Calls API Gateway endpoints
- ✅ Stores data in DynamoDB
- ✅ Requires AWS infrastructure to be set up
- ❌ Will show error if AWS not configured

### Build for PROD AWS deployment
```bash
# Build with production environment variables
npm run build

# Preview production build locally
npm run preview

# Deploy to S3 + CloudFront
aws s3 sync dist/ s3://your-bucket --delete
```

---

## Feature Comparison

| Feature | LOCAL TEST | PROD AWS |
|---------|-----------|----------|
| **Start Command** | `npm run dev` | `npm run dev` (with AWS config) |
| **Authentication** | Dev PBKDF2 | AWS Cognito |
| **Data Storage** | localStorage | DynamoDB |
| **API** | Direct JS functions | API Gateway + Lambda |
| **Encryption** | None (plain JSON) | AWS KMS (at rest) |
| **User Isolation** | Browser-based | IAM + Cognito |
| **Cost** | Free | ~$5-20/month |
| **Internet Required** | No | Yes |
| **Setup Time** | 0 minutes | 1-2 hours |

---

## Code Changes Between Environments

### Authentication Check
```typescript
// src/utils/auth.ts
const DEV_AUTH_ENABLED = import.meta.env.VITE_DEV_ONLY_AUTH === 'true';

if (!DEV_AUTH_ENABLED && import.meta.env.PROD) {
  throw new Error('Configure AWS Cognito or enable dev auth');
}
```

### API Service Layer
```typescript
// src/services/api.ts
import { IS_AWS_MODE } from '../aws-config';

export const apiService = {
  async getTransactions(): Promise<Transaction[]> {
    if (IS_AWS_MODE) {
      return await API.get('financeflow', '/transactions', {});
    }
    return localStorage.getStoredTransactions(getCurrentUserId());
  }
};
```

### Storage Utilities
```typescript
// src/utils/storage.ts
// LOCAL TEST: Direct localStorage access
export const saveTransactions = (userId: string, transactions: Transaction[]) => {
  localStorage.setItem(`finance_${userId}_transactions`, JSON.stringify(transactions));
};

// PROD AWS: Replace with API calls
// export const saveTransactions = async (transactions: Transaction[]) => {
//   await apiService.createTransactions(transactions);
// };
```

---

## Common Workflows

### Workflow 1: Develop Locally
```bash
# 1. Ensure .env has DEV mode enabled
echo "VITE_DEV_ONLY_AUTH=true" > .env

# 2. Start dev server
npm run dev

# 3. Make changes
# Files auto-reload with Vite

# 4. Test with Playwright
npx playwright test

# 5. Commit changes
git add .
git commit -m "feat: new feature"
```

### Workflow 2: Test Against AWS (without deploying)
```bash
# 1. Set up AWS backend (see AWS_DEPLOYMENT_GUIDE.md)
amplify push

# 2. Update .env with AWS credentials
VITE_DEV_ONLY_AUTH=false
VITE_AWS_COGNITO_USER_POOL_ID=...
VITE_AWS_COGNITO_CLIENT_ID=...
VITE_API_GATEWAY_URL=...

# 3. Start dev server
npm run dev

# 4. Test authentication with real Cognito
# 5. Test API calls to real Lambda/DynamoDB
```

### Workflow 3: Deploy to Production
```bash
# 1. Build production bundle
npm run build

# 2. Test production build locally
npm run preview

# 3. Deploy to AWS
amplify publish
# or
aws s3 sync dist/ s3://your-bucket --delete

# 4. Verify deployment
curl https://your-cloudfront-url.com

# 5. Test in production
npx playwright test --config=playwright.prod.config.ts
```

---

## Troubleshooting

### Error: "DEV authentication is disabled"
**Cause:** `VITE_DEV_ONLY_AUTH` is false but no AWS Cognito configured  
**Solution:** Either:
1. Enable dev auth: `echo "VITE_DEV_ONLY_AUTH=true" > .env`
2. Or configure AWS Cognito (see AWS_DEPLOYMENT_GUIDE.md)

### Error: "Cannot read property 'configure' of undefined"
**Cause:** Amplify not properly configured  
**Solution:** 
```bash
npm install aws-amplify @aws-amplify/ui-react
```

### Error: CORS blocked
**Cause:** API Gateway CORS not configured  
**Solution:** Add CORS headers to Lambda responses:
```javascript
return {
  statusCode: 200,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  },
  body: JSON.stringify(data)
};
```

### localStorage is empty after switching to AWS mode
**Cause:** localStorage is browser-specific and not synced to AWS  
**Solution:** This is expected. AWS uses DynamoDB. You can:
1. Create new data in AWS mode, or
2. Write a migration script to upload localStorage to DynamoDB

---

## Best Practices

### Development
1. ✅ Always use LOCAL TEST mode for development
2. ✅ Keep `.env` in `.gitignore`
3. ✅ Commit `.env.example` as template
4. ✅ Test changes locally before AWS deployment
5. ✅ Use Playwright for automated testing

### Production
1. ✅ Never commit AWS credentials to git
2. ✅ Use environment variables for sensitive data
3. ✅ Enable AWS CloudTrail for audit logging
4. ✅ Set up CloudWatch alarms for errors
5. ✅ Use AWS Secrets Manager for API keys
6. ✅ Enable DynamoDB point-in-time recovery
7. ✅ Configure budget alerts in AWS

### Testing
1. ✅ Test in LOCAL TEST mode first
2. ✅ Test against AWS staging environment
3. ✅ Run Playwright tests before deployment
4. ✅ Verify production build works with `npm run preview`
5. ✅ Test with real Cognito users before public release

---

## Quick Commands

```bash
# Switch to LOCAL TEST
echo "VITE_DEV_ONLY_AUTH=true" > .env && npm run dev

# Switch to PROD AWS (requires AWS setup)
echo "VITE_DEV_ONLY_AUTH=false" > .env && npm run dev

# Build for production
npm run build

# Test production build
npm run preview

# Deploy to AWS
amplify publish

# Run tests
npx playwright test

# Check for errors
npm run lint
npm run build
```

---

## Environment Variables Reference

### Required for LOCAL TEST
```bash
VITE_DEV_ONLY_AUTH=true
```

### Required for PROD AWS
```bash
VITE_DEV_ONLY_AUTH=false
VITE_AWS_REGION=eu-central-1
VITE_AWS_COGNITO_USER_POOL_ID=eu-central-1_XXXXXXXXX
VITE_AWS_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_API_GATEWAY_URL=https://xxxxxxxxxx.execute-api.eu-central-1.amazonaws.com/prod
```

### Optional
```bash
VITE_ENVIRONMENT=local|staging|production
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ANALYTICS=true|false
VITE_AWS_PINPOINT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## Getting Help

### For LOCAL TEST Issues
1. Check console for errors
2. Verify `.env` has `VITE_DEV_ONLY_AUTH=true`
3. Clear localStorage: `localStorage.clear()`
4. Restart dev server: `npm run dev`

### For PROD AWS Issues
1. Check AWS CloudWatch logs
2. Verify Cognito User Pool configuration
3. Test API Gateway endpoints with Postman
4. Check DynamoDB tables in AWS Console
5. Review IAM permissions for Lambda

### Resources
- Local docs: `docs/AWS_DEPLOYMENT_GUIDE.md`
- AWS docs: https://docs.aws.amazon.com
- Amplify docs: https://docs.amplify.aws
- GitHub issues: [your-repo]/issues

---

**Last Updated:** 2025-11-08  
**Version:** 1.0.0
