# AWS Migration Checklist

## ✅ Completed Tasks

### Phase 1: Remove Fake Security
- [x] Remove client-side encryption from `storage.ts`
- [x] Deprecate `encryption.ts`
- [x] Add environment variable for dev auth (`VITE_DEV_ONLY_AUTH`)
- [x] Create `.env` file
- [x] Create money utilities (`lib/money.ts`)
- [x] Create date utilities (`lib/dates.ts`)
- [x] Comprehensive Playwright testing

### Phase 2: Verify Core Functionality
- [x] User registration works with plain JSON
- [x] User authentication works
- [x] Transaction creation works (expense)
- [x] Transaction creation works (income)
- [x] Dashboard calculations correct
- [x] XSS protection still works
- [x] Charts display correctly
- [x] All navigation working

## 📋 Remaining Tasks

### Phase 3: Data Model Migration (Next Steps)

#### 1. Update Transaction Type
**File:** `src/types/Transaction.ts`

**Current:**
```typescript
export interface Transaction {
  id: string;
  amount: number; // ❌ Float precision issues
  date: Date; // ❌ Timezone surprises
  // ...
}
```

**Target:**
```typescript
export interface Transaction {
  id: string;
  amountMinor: number; // ✅ Integer cents (50.25€ = 5025 cents)
  date: string; // ✅ YYYY-MM-DD format (no TZ issues)
  // ...
}
```

#### 2. Update Transaction Form
**File:** `src/components/TransactionForm.tsx`

**Changes Needed:**
- Use `parseAmountToMinor()` when saving transactions
- Use `formatAmount()` when displaying amounts
- Use `toISODate()` for date inputs
- Update validation to check for integer cents

#### 3. Update Calculations
**File:** `src/utils/calculations.ts`

**Changes Needed:**
- Work with `amountMinor` instead of `amount`
- Use `fromMinor()` to convert back to euros for display
- All math operations use integers (no float precision errors)

#### 4. Update Display Components
**Files:**
- `src/components/Dashboard.tsx`
- `src/components/TransactionList.tsx`
- `src/components/Charts.tsx`

**Changes Needed:**
- Use `formatAmount(fromMinor(transaction.amountMinor))` for display
- Use `formatDate(transaction.date)` for date display

#### 5. Migration Script (Optional)
**Create:** `src/utils/migrateData.ts`

**Purpose:**
- Convert existing localStorage data to new format
- Run once on app load if old data detected
- Convert `amount` → `amountMinor`
- Convert `Date` → `string`

### Phase 4: AWS Integration (Future)

#### 1. Backend API Setup
- [ ] Create AWS Lambda functions for CRUD operations
- [ ] Set up API Gateway with CORS
- [ ] Configure DynamoDB tables:
  - `Users` table (partition key: `userId`)
  - `Transactions` table (partition key: `userId`, sort key: `transactionId`)
  - `Categories` table (partition key: `userId`, sort key: `categoryId`)

#### 2. Authentication Migration
- [ ] Set up AWS Cognito User Pool
- [ ] Configure OAuth 2.0 / OpenID Connect
- [ ] Replace `auth.ts` with Amplify Auth
- [ ] Update login/register forms to use Cognito

#### 3. Storage Migration
- [ ] Replace localStorage calls with API calls
- [ ] Create `src/api/` directory with service modules
- [ ] Implement retry logic and error handling
- [ ] Add loading states for async operations

#### 4. Encryption at Rest
- [ ] Enable DynamoDB encryption with AWS KMS
- [ ] Configure KMS key policies
- [ ] No client-side changes needed (AWS handles encryption)

#### 5. Frontend Deployment
- [ ] Build production bundle: `npm run build`
- [ ] Deploy to S3 bucket
- [ ] Configure CloudFront distribution
- [ ] Set up custom domain with Route 53
- [ ] Configure SSL certificate with ACM

#### 6. Environment Configuration
- [ ] Create `.env.production` with API Gateway URLs
- [ ] Configure Cognito client IDs
- [ ] Set up CI/CD pipeline (GitHub Actions / AWS CodePipeline)

## 🚨 Critical Notes

### DO NOT Do These Things
❌ Add client-side encryption back  
❌ Store passwords in plain text  
❌ Skip XSS sanitization  
❌ Use `eval()` or `dangerouslySetInnerHTML` without sanitization  
❌ Store secrets in source code  

### DO These Things
✅ Keep environment variables out of git (`.env` in `.gitignore`)  
✅ Use AWS KMS for encryption at rest  
✅ Use AWS Cognito for authentication  
✅ Validate all user input (Zod schemas)  
✅ Sanitize all user content (DOMPurify)  
✅ Use integer cents for currency (avoid float precision)  
✅ Use YYYY-MM-DD strings for dates (avoid timezone issues)  

## 📊 Current Status

**Development Readiness:** 90% ✅
- Core features working
- Security foundations solid
- Data storage clean
- Testing comprehensive

**AWS Readiness:** 40% ⏳
- Data models need updates
- Backend API not created yet
- Cognito not integrated
- DynamoDB not configured

**Estimated Time to AWS Deployment:**
- Data model updates: 2-3 hours
- AWS backend setup: 4-6 hours
- Frontend migration: 3-4 hours
- Testing and debugging: 2-3 hours
- **Total: 11-16 hours**

## 🎯 Next Immediate Actions

1. **Update Transaction type** to use `amountMinor` and `date: string`
2. **Update TransactionForm** to use money and date utilities
3. **Update calculations** to work with integer cents
4. **Test everything again** with Playwright
5. **Create migration script** for existing data (optional)

---
**Last Updated:** 2025-11-08  
**Status:** Ready for Phase 3 implementation
