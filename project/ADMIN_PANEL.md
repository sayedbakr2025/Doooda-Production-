# Doooda Admin Panel - Complete Documentation

## Executive Summary

The Admin Panel is an **internal-only** control system for managing Doooda's platform configuration, pricing, users, integrations, and system settings. Security is non-negotiable - all admin operations are authenticated, authorized, rate-limited, and fully audit-logged.

---

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Database Schema](#database-schema)
3. [Admin Services](#admin-services)
4. [API Endpoints](#api-endpoints)
5. [Permission Matrix](#permission-matrix)
6. [Audit Logging](#audit-logging)
7. [Usage Guidelines](#usage-guidelines)
8. [Edge Cases & Safety](#edge-cases--safety)

---

## Security Architecture

### Authentication & Authorization

**Access Control:**
- Admin users ONLY (role = 'admin')
- Role verified server-side on EVERY request
- No shared controllers with writer routes
- Admin routes completely isolated

**Security Guards:**

```typescript
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  // All admin endpoints protected
}
```

**AdminGuard Implementation:**
```typescript
// Double-check role from database (not just JWT)
const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
if (dbUser.role !== 'admin') {
  throw new ForbiddenException('Admin access required');
}
```

### Data Protection

**Sensitive Data Handling:**

1. **Encrypted at Rest:**
   - SMTP passwords
   - AI API keys
   - Payment provider secret keys
   - Webhook secrets

2. **Masked in Responses:**
   ```json
   {
     "apiKey": "sk_live_****",
     "password": "********"
   }
   ```

3. **Never Logged:**
   - Raw passwords
   - Full API keys
   - Webhook secrets

4. **Encryption Service:**
   ```typescript
   // AES-256-GCM encryption
   const encrypted = encryptionService.encrypt(sensitiveData);
   const decrypted = encryptionService.decrypt(encrypted);
   const masked = encryptionService.maskSecret(secret, 4); // "sk_l****"
   ```

### Rate Limiting

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Dashboard metrics | 60 | 1 minute |
| User searches | 30 | 1 minute |
| Settings updates | 10 | 1 minute |
| Bulk operations | 5 | 5 minutes |

### CSRF Protection

- CSRF tokens required for all state-changing operations
- Token validation on every POST/PUT/DELETE request
- Tokens rotate after each use

---

## Database Schema

### 8 New Admin Tables

#### 1. **user_overrides** - Testing & Custom Access

```sql
CREATE TABLE user_overrides (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  override_type text CHECK (override_type IN ('full_access', 'ai_limit', 'feature_access', 'custom')),
  override_value jsonb,
  reason text,
  granted_by_admin_id uuid REFERENCES users(id),
  expires_at timestamp,
  is_active boolean,
  created_at timestamp,
  updated_at timestamp
);
```

**Purpose:**
- Grant free users full access for testing
- Custom AI limits per user
- Partnership/promotional access
- Temporary feature access

**Business Rules:**
- Override does NOT affect pricing lock
- All overrides logged in audit_logs
- Can expire automatically
- Toggle on/off without deletion

**Example Usage:**
```json
{
  "userId": "user-uuid",
  "overrideType": "full_access",
  "overrideValue": {
    "allFeatures": true,
    "reason": "Beta testing program"
  },
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

#### 2. **smtp_settings** - Email Configuration

```sql
CREATE TABLE smtp_settings (
  id uuid PRIMARY KEY,
  provider_name text,
  host text,
  port integer,
  username text,
  password_encrypted text,
  from_email text,
  from_name text,
  use_tls boolean,
  is_active boolean,
  last_test_at timestamp,
  last_test_result text,
  created_at timestamp,
  updated_at timestamp
);
```

**Security:**
- Password encrypted at rest (AES-256-GCM)
- Password NEVER returned in full (masked)
- Test email button validates configuration
- Only one active configuration at a time

**Supported Providers:**
- SendGrid
- Mailgun
- AWS SES
- Custom SMTP

#### 3. **ai_providers** - AI Token Management

```sql
CREATE TABLE ai_providers (
  id uuid PRIMARY KEY,
  provider_name text CHECK (provider_name IN ('openai', 'gemini', 'copilot', 'deepseek', 'anthropic')),
  api_key_encrypted text,
  api_endpoint text,
  model_name text,
  max_tokens integer,
  temperature decimal(3,2),
  is_enabled boolean,
  is_default boolean,
  daily_request_limit integer,
  last_test_at timestamp,
  last_test_result text,
  created_at timestamp,
  updated_at timestamp
);
```

**Security:**
- API keys encrypted at rest
- Keys NEVER sent to frontend
- Test uses minimal safe request
- Only success/failure logged (not AI responses)

**Features:**
- Multiple providers supported
- Easy switching between providers
- A/B testing different models
- Fallback if primary provider fails

#### 4. **publishers** - Publisher Database

```sql
CREATE TABLE publishers (
  id uuid PRIMARY KEY,
  name text,
  country text,
  submission_email text,
  website text,
  genres text[],
  accepts_new_writers boolean,
  submission_guidelines_url text,
  notes text,
  is_active boolean,
  sort_order integer,
  created_at timestamp,
  updated_at timestamp
);
```

**Business Rules:**
- Writers can READ only (no edits)
- Sorted by country on frontend
- Only active publishers shown to writers
- Admin can archive without deletion

#### 5. **tracking_settings** - Analytics & Pixels

```sql
CREATE TABLE tracking_settings (
  id uuid PRIMARY KEY,
  tracker_type text CHECK (tracker_type IN ('google_tag_manager', 'meta_pixel', 'google_analytics', 'custom')),
  tracker_id text,
  script_content text,
  placement text CHECK (placement IN ('head', 'body_start', 'body_end')),
  is_enabled boolean,
  applies_to text CHECK (applies_to IN ('all', 'writers_only', 'landing_only', 'admin_only')),
  notes text,
  created_at timestamp,
  updated_at timestamp
);
```

**Security:**
- Script content sanitized (script tag only, no inline JS)
- No execution of arbitrary code
- Toggle enable/disable per tracker
- Only injected on approved pages

#### 6. **payment_provider_settings** - Payment Configuration

```sql
CREATE TABLE payment_provider_settings (
  id uuid PRIMARY KEY,
  provider_name text CHECK (provider_name IN ('stripe', 'paddle', 'paypal')),
  publishable_key text,
  secret_key_encrypted text,
  webhook_secret_encrypted text,
  webhook_endpoint text,
  is_enabled boolean,
  is_test_mode boolean,
  last_webhook_at timestamp,
  webhook_failures_count integer,
  currency text,
  created_at timestamp,
  updated_at timestamp
);
```

**Security:**
- Secret keys encrypted at rest
- Webhook signature verification mandatory
- No payments processed if webhook invalid
- Keys masked in responses

#### 7. **message_templates** - Dynamic Messaging

```sql
CREATE TABLE message_templates (
  id uuid PRIMARY KEY,
  template_key text UNIQUE,
  template_name text,
  template_type text CHECK (template_type IN ('email', 'in_app', 'push_notification', 'system')),
  category text CHECK (category IN ('onboarding', 'motivation', 'reminder', 'celebration', 'error', 'marketing', 'system')),
  subject_en text,
  subject_ar text,
  content_en text,
  content_ar text,
  variables jsonb,
  is_enabled boolean,
  delivery_channel text[],
  send_conditions jsonb,
  fallback_template_key text,
  last_sent_at timestamp,
  sent_count integer,
  created_at timestamp,
  updated_at timestamp
);
```

**Purpose:**
- No hardcoded messages in code
- Admin controls all user-facing text
- Multi-language support (Arabic & English)
- Dynamic variable substitution

**Supported Placeholders:**
```
{{pen_name}}         - User's pen name
{{first_name}}       - User's first name
{{project_title}}    - Current project name
{{daily_goal}}       - Daily writing goal
{{current_progress}} - Current word count
{{writing_time}}     - Time spent writing
{{achievement}}      - Achievement name
{{date}}             - Current date
```

**Message Categories:**
- **onboarding:** Welcome, verification, setup
- **motivation:** Daily encouragement, writing streaks
- **reminder:** Session reminders, goal nudges
- **celebration:** Milestones, achievements
- **error:** System errors, validation messages
- **marketing:** Newsletter, announcements

#### 8. **ai_usage_limits** - Ask Doooda Control

```sql
CREATE TABLE ai_usage_limits (
  id uuid PRIMARY KEY,
  limit_type text CHECK (limit_type IN ('global_default', 'plan_based', 'user_override')),
  plan_name text,
  user_id uuid REFERENCES users(id),
  daily_limit integer,
  monthly_limit integer,
  is_unlimited boolean,
  is_active boolean,
  reason text,
  set_by_admin_id uuid REFERENCES users(id),
  created_at timestamp,
  updated_at timestamp
);

CREATE TABLE ai_usage_tracking (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  request_type text,
  provider_used text,
  tokens_used integer,
  request_timestamp timestamp,
  response_status text,
  error_message text
);
```

**Limit Resolution Order:**
1. Check **user_override** (highest priority)
2. Check **plan_based** limit
3. Fall back to **global_default**

**Purpose:**
- Prevent AI abuse
- Control costs per user
- Emergency disable switch
- User-specific overrides for special cases

---

## Admin Services

### 1. AdminDashboardService

**Metrics Provided:**

```typescript
{
  overview: {
    totalUsers: 1250,
    freeUsers: 980,
    paidUsers: 270,
    activeSubscriptions: 270,
    totalProjects: 3456,
    recentSignups: 45  // Last 7 days
  },
  subscriptionsByPlan: [
    { plan_name: 'STANDARD', subscriber_count: 180 },
    { plan_name: 'PRO', subscriber_count: 90 }
  ],
  revenue: {
    monthlyRecurringRevenue: 2700,  // USD
    annualRecurringRevenue: 32400,
    activeSubscriptionsCount: 270
  },
  userGrowth: [
    { date: '2024-01-07', signups: 12 },
    // ... 30 days
  ]
}
```

**Security:**
- Aggregated data only
- No personal information exposed
- No user content visible

### 2. AdminPricingService

**Operations:**

**Create New Price Version:**
```typescript
const newPrice = await adminPricingService.createPriceVersion({
  planName: 'STANDARD',
  priceCents: 1500,  // $15.00
  currency: 'USD',
  billingInterval: 'MONTHLY',
  features: {
    maxProjects: 999,
    maxChaptersPerProject: 999,
    marketingEnabled: true,
    askDoooda: false
  }
}, adminId);
```

**Critical Rules:**
- NEVER modifies existing price_versions
- Creating new price automatically deactivates old one
- Old price marked with `activeUntil = now()`
- New price marked with `activeUntil = NULL` (current)
- Existing subscribers keep their locked prices
- New subscribers get new price

**Update Features Only:**
```typescript
// Can ONLY update features, NOT price or billing
await adminPricingService.updatePriceVersionFeatures(
  priceVersionId,
  { askDoooda: true },  // Enable AI for plan
  adminId
);
```

**Get All Price Versions:**
```typescript
const active = await adminPricingService.getActivePriceVersions();
const historical = await adminPricingService.getHistoricalPriceVersions();
```

### 3. AdminUsersService

**User Search:**
```typescript
const results = await adminUsersService.searchUsers({
  email: 'john',
  penName: 'writer',
  planType: 'PRO',
  page: 1,
  limit: 50
});

// Returns:
{
  users: [
    {
      id: 'uuid',
      email: 'john@example.com',
      penName: 'John Writer',
      currentPlan: 'PRO',
      subscriptionStatus: 'ACTIVE',
      emailVerified: true,
      lastLoginAt: '2024-01-07T10:30:00Z'
    }
  ],
  pagination: {
    page: 1,
    limit: 50,
    total: 127,
    totalPages: 3
  }
}
```

**User Details:**
```typescript
const details = await adminUsersService.getUserDetails(userId);

// Returns comprehensive user info:
{
  ...userInfo,
  subscriptions: [...],
  subscriptionHistory: [...],
  auditLogs: [...],
  overrides: [...]
}
```

**Create User Override:**
```typescript
await adminUsersService.createUserOverride({
  userId: 'user-uuid',
  overrideType: 'full_access',
  overrideValue: { allFeatures: true },
  reason: 'Beta testing program',
  expiresAt: new Date('2024-12-31')
}, adminId);
```

**Disable/Enable User Access:**
```typescript
// Soft delete + revoke all sessions
await adminUsersService.disableUserAccess(userId, 'Spam account', adminId);

// Restore access
await adminUsersService.enableUserAccess(userId, adminId);
```

**Create Manual User:**
```typescript
const result = await adminUsersService.createManualUser({
  email: 'partner@example.com',
  firstName: 'Partner',
  lastName: 'User',
  penName: 'Partner Writer',
  locale: 'en',
  planName: 'PRO'
}, adminId);

// Returns:
{
  user: {...},
  temporaryPassword: 'random-secure-password',
  message: 'User created. Send temporary password securely.'
}
```

### 4. AdminSettingsService

**SMTP Configuration:**
```typescript
await adminSettingsService.createSmtpSettings({
  providerName: 'sendgrid',
  host: 'smtp.sendgrid.net',
  port: 587,
  username: 'apikey',
  password: 'SG.xxx',
  fromEmail: 'noreply@doooda.com',
  fromName: 'Doooda',
  useTls: true
}, adminId);

// Test SMTP
const result = await adminSettingsService.testSmtpConnection(settingId);
```

**AI Provider Configuration:**
```typescript
await adminSettingsService.createAiProvider({
  providerName: 'openai',
  apiKey: 'sk-xxx',
  modelName: 'gpt-4',
  maxTokens: 2000,
  temperature: 0.7,
  isDefault: true
}, adminId);

// Toggle provider
await adminSettingsService.toggleAiProvider(providerId, true, adminId);

// Test AI connection
const result = await adminSettingsService.testAiProvider(providerId);
```

**Payment Provider Configuration:**
```typescript
await adminSettingsService.createPaymentProvider({
  providerName: 'stripe',
  publishableKey: 'pk_live_xxx',
  secretKey: 'sk_live_xxx',
  webhookSecret: 'whsec_xxx',
  webhookEndpoint: 'https://api.doooda.com/webhooks/stripe',
  currency: 'USD',
  isTestMode: false
}, adminId);
```

**Tracking Configuration:**
```typescript
await adminSettingsService.createTrackingSetting({
  trackerType: 'google_tag_manager',
  trackerId: 'GTM-XXXXXX',
  placement: 'head',
  appliesTo: 'all'
}, adminId);

// Toggle tracker
await adminSettingsService.toggleTrackingSetting(settingId, true, adminId);
```

### 5. AdminMessageTemplatesService

**Create Template:**
```typescript
await adminMessageTemplatesService.createTemplate({
  templateKey: 'welcome_email',
  templateName: 'New Writer Welcome Email',
  templateType: 'email',
  category: 'onboarding',
  subjectEn: 'Welcome to Doooda, {{pen_name}}!',
  subjectAr: 'مرحباً بك في دووودة، {{pen_name}}!',
  contentEn: 'Welcome {{first_name}}! Start your writing journey...',
  contentAr: 'مرحباً {{first_name}}! ابدأ رحلتك في الكتابة...',
  variables: ['pen_name', 'first_name', 'project_title'],
  deliveryChannel: ['email', 'in_app']
}, adminId);
```

**Update Template:**
```typescript
await adminMessageTemplatesService.updateTemplate(
  templateId,
  {
    contentEn: 'Updated English content...',
    contentAr: 'محتوى عربي محدث...'
  },
  adminId
);
```

**Preview Template:**
```typescript
const preview = await adminMessageTemplatesService.previewTemplate(
  templateId,
  'ar',  // locale
  {
    pen_name: 'أحمد حسن',
    first_name: 'أحمد',
    project_title: 'روايتي الأولى'
  }
);

// Returns:
{
  subject: 'مرحباً بك في دووودة، أحمد حسن!',
  content: 'مرحباً أحمد! ابدأ رحلتك في الكتابة مع روايتك الأولى...',
  locale: 'ar',
  renderedAt: '2024-01-07T12:34:56Z'
}
```

**Get Templates:**
```typescript
const allTemplates = await adminMessageTemplatesService.getAllTemplates({
  type: 'email',
  category: 'motivation'
});

const template = await adminMessageTemplatesService.getTemplateByKey('daily_motivation');
```

**Template Stats:**
```typescript
const stats = await adminMessageTemplatesService.getTemplateStats();

// Returns:
[
  {
    template_type: 'email',
    total_templates: 15,
    enabled_count: 12,
    total_sent: 45000
  },
  {
    template_type: 'in_app',
    total_templates: 8,
    enabled_count: 8,
    total_sent: 120000
  }
]
```

### 6. AdminPublishersService

**Create Publisher:**
```typescript
await adminPublishersService.createPublisher({
  name: 'Dar Al Shorouk',
  country: 'Egypt',
  submissionEmail: 'submissions@shorouk.com',
  website: 'https://shorouk.com',
  genres: ['Fiction', 'Non-Fiction', 'Poetry'],
  acceptsNewWriters: true,
  submissionGuidelinesUrl: 'https://shorouk.com/guidelines',
  notes: 'Major Egyptian publisher',
  sortOrder: 1
}, adminId);
```

**Update Publisher:**
```typescript
await adminPublishersService.updatePublisher(
  publisherId,
  {
    acceptsNewWriters: false,
    notes: 'Currently not accepting new manuscripts'
  },
  adminId
);
```

**Get Publishers:**
```typescript
// All publishers
const all = await adminPublishersService.getAllPublishers();

// Filter by country
const egyptian = await adminPublishersService.getAllPublishers({
  country: 'Egypt',
  isActive: true
});

// Get by country stats
const byCountry = await adminPublishersService.getPublishersByCountry();

// Returns:
[
  { country: 'Egypt', publisher_count: 15, active_count: 12 },
  { country: 'UAE', publisher_count: 8, active_count: 7 },
  { country: 'Saudi Arabia', publisher_count: 10, active_count: 9 }
]
```

### 7. AdminAiLimitsService

**Set Global Default:**
```typescript
await adminAiLimitsService.setGlobalDefaultLimit(
  10,   // daily limit
  100,  // monthly limit
  adminId
);
```

**Set Plan-Based Limit:**
```typescript
// PRO plan gets higher limits
await adminAiLimitsService.setPlanBasedLimit(
  'PRO',
  50,   // daily
  500,  // monthly
  adminId
);

// STANDARD plan gets moderate limits
await adminAiLimitsService.setPlanBasedLimit(
  'STANDARD',
  20,   // daily
  200,  // monthly
  adminId
);

// FREE plan gets no AI access
await adminAiLimitsService.setPlanBasedLimit(
  'FREE',
  0,    // daily
  0,    // monthly
  adminId
);
```

**User Override:**
```typescript
// Grant unlimited AI for special user
await adminAiLimitsService.setUserOverride(
  userId,
  {
    isUnlimited: true,
    reason: 'Content creator partnership'
  },
  adminId
);

// Custom limits for user
await adminAiLimitsService.setUserOverride(
  userId,
  {
    dailyLimit: 100,
    monthlyLimit: 1000,
    reason: 'Enterprise client'
  },
  adminId
);

// Remove override
await adminAiLimitsService.removeUserOverride(userId, adminId);
```

**Get User Limit:**
```typescript
const limit = await adminAiLimitsService.getUserLimit(userId);

// Returns:
{
  source: 'user_override',  // or 'plan_based', 'global_default'
  limit: {
    dailyLimit: 100,
    monthlyLimit: 1000,
    isUnlimited: false
  }
}
```

**Usage Stats:**
```typescript
// Per-user stats
const userStats = await adminAiLimitsService.getUserUsageStats(userId, 30);

// Returns:
{
  dailyStats: [
    {
      date: '2024-01-07',
      request_count: 15,
      tokens_used: 3500,
      successful_requests: 14,
      rate_limited_requests: 1
    }
  ],
  todayRequests: 5,
  monthRequests: 125
}

// Global stats
const globalStats = await adminAiLimitsService.getGlobalUsageStats();
```

**Emergency Disable:**
```typescript
// Disable Ask Doooda globally (emergency)
await adminAiLimitsService.toggleAskDoodaGlobally(false, adminId);

// Re-enable
await adminAiLimitsService.toggleAskDoodaGlobally(true, adminId);
```

---

## Audit Logging

### Every Admin Action Logged

**Events Logged:**
- price_version_created
- price_version_features_updated
- user_override_created
- user_override_removed
- user_access_disabled
- user_access_enabled
- manual_user_created
- smtp_settings_created
- ai_provider_created
- ai_provider_enabled
- ai_provider_disabled
- payment_provider_created
- tracking_setting_created
- tracking_enabled
- tracking_disabled
- message_template_created
- message_template_updated
- message_template_enabled
- message_template_disabled
- publisher_created
- publisher_updated
- publisher_activated
- publisher_deactivated
- publisher_deleted
- ai_global_limit_set
- ai_plan_limit_set
- ai_user_limit_override_set
- ai_user_limit_override_removed
- ask_doooda_enabled_globally
- ask_doooda_disabled_globally

**Audit Log Structure:**
```json
{
  "id": "uuid",
  "adminId": "admin-uuid",
  "userId": "affected-user-uuid (if applicable)",
  "action": "price_version_created",
  "resourceType": "price_version",
  "resourceId": "resource-uuid",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "metadata": {
    "planName": "STANDARD",
    "priceCents": 1500,
    "previousVersionId": "old-uuid"
  },
  "occurredAt": "2024-01-07T12:34:56Z"
}
```

**Security:**
- Append-only (never updated or deleted)
- Admin-only access
- Tamper-resistant
- Full context preserved in metadata

---

## Permission Matrix

| Operation | Admin | Writer | Anonymous |
|-----------|-------|--------|-----------|
| **Dashboard** |
| View metrics | ✅ | ❌ | ❌ |
| View revenue | ✅ | ❌ | ❌ |
| **Pricing** |
| Create price version | ✅ | ❌ | ❌ |
| Update features | ✅ | ❌ | ❌ |
| View active prices | ✅ | ✅ (public) | ✅ (public) |
| View historical prices | ✅ | ❌ | ❌ |
| **Users** |
| Search users | ✅ | ❌ | ❌ |
| View user details | ✅ | Self only | ❌ |
| Create user override | ✅ | ❌ | ❌ |
| Disable user | ✅ | ❌ | ❌ |
| Create manual user | ✅ | ❌ | ❌ |
| **Settings** |
| Configure SMTP | ✅ | ❌ | ❌ |
| Configure AI | ✅ | ❌ | ❌ |
| Configure payment | ✅ | ❌ | ❌ |
| Configure tracking | ✅ | ❌ | ❌ |
| **Messages** |
| Create template | ✅ | ❌ | ❌ |
| Update template | ✅ | ❌ | ❌ |
| Preview template | ✅ | ❌ | ❌ |
| View enabled templates | ✅ | ✅ | ❌ |
| **Publishers** |
| Create publisher | ✅ | ❌ | ❌ |
| Update publisher | ✅ | ❌ | ❌ |
| View publishers | ✅ | ✅ (active only) | ❌ |
| Delete publisher | ✅ | ❌ | ❌ |
| **AI Limits** |
| Set global limit | ✅ | ❌ | ❌ |
| Set plan limit | ✅ | ❌ | ❌ |
| Set user override | ✅ | ❌ | ❌ |
| View usage stats | ✅ | Self only | ❌ |
| Emergency disable | ✅ | ❌ | ❌ |
| **Audit Logs** |
| View all logs | ✅ | ❌ | ❌ |
| Export logs | ✅ | ❌ | ❌ |

---

## Edge Cases & Safety

### 1. Pricing Lock Safety

**Scenario:** Admin changes price from $10 to $15

**What Happens:**
```
Old price_version (abc123):
  priceCents = 1000
  activeUntil = 2024-01-07T12:00:00Z  ← MARKED HISTORICAL

New price_version (def456):
  priceCents = 1500
  activeUntil = NULL  ← ACTIVE

Existing Subscribers:
  subscription.priceVersionId = abc123
  Still pay $10/month (LOCKED)

New Subscribers:
  subscription.priceVersionId = def456
  Pay $15/month (NEW LOCK)
```

**Safety Guarantees:**
- Existing subscribers NEVER affected by price changes
- No automatic migrations
- Historical prices preserved forever
- Audit log records the change

### 2. User Override Expiry

**Scenario:** User override expires

**Automatic Handling:**
```sql
-- Cron job runs daily
UPDATE user_overrides
SET is_active = false
WHERE expires_at < NOW()
  AND is_active = true;
```

**Result:**
- User reverts to regular plan limits
- No manual intervention needed
- Audit log records expiry

### 3. AI Provider Failure

**Scenario:** Primary AI provider is down

**Fallback Strategy:**
```typescript
// 1. Try default provider
const defaultProvider = await getDefaultAiProvider();

// 2. If fails, try next enabled provider
const fallbackProvider = await getNextEnabledProvider();

// 3. If all fail, return graceful error
if (!fallbackProvider) {
  return {
    error: 'AI service temporarily unavailable',
    status: 'degraded'
  };
}
```

### 4. SMTP Test Failure

**Scenario:** Admin configures wrong SMTP settings

**Safety:**
```typescript
// Test before activating
const testResult = await testSmtpConnection(settingId);

if (!testResult.success) {
  await prisma.$queryRaw`
    UPDATE smtp_settings
    SET is_active = false,
        last_test_result = ${testResult.error}
    WHERE id = ${settingId}::uuid
  `;

  throw new BadRequestException('SMTP test failed. Configuration not activated.');
}
```

**Result:**
- Failed configuration NOT activated
- Old configuration remains active
- Error logged for debugging

### 5. Message Template Missing

**Scenario:** Template deleted but still referenced

**Fallback Strategy:**
```typescript
async function getMessageContent(templateKey: string, locale: string) {
  const template = await findTemplate(templateKey);

  if (!template) {
    // 1. Try fallback template
    if (template?.fallbackTemplateKey) {
      return findTemplate(template.fallbackTemplateKey);
    }

    // 2. Use hardcoded fallback
    return getDefaultMessage(templateKey, locale);
  }

  return template;
}
```

**Result:**
- System never breaks due to missing template
- Graceful degradation to fallback
- Alert admin to fix missing template

### 6. Publisher Deletion Safety

**Scenario:** Admin deletes publisher accidentally

**Safety:**
```typescript
// Soft delete by default
async deletePublisher(publisherId: string) {
  await prisma.$queryRaw`
    UPDATE publishers
    SET is_active = false
    WHERE id = ${publisherId}::uuid
  `;

  // Not actually deleted - just hidden
}

// Hard delete requires confirmation + admin override
async forceDeletePublisher(publisherId: string, confirmationCode: string) {
  if (confirmationCode !== 'PERMANENTLY_DELETE') {
    throw new BadRequestException('Confirmation required');
  }

  await prisma.$queryRaw`
    DELETE FROM publishers WHERE id = ${publisherId}::uuid
  `;
}
```

### 7. Webhook Signature Mismatch

**Scenario:** Fake Stripe webhook received

**Protection:**
```typescript
async handleWebhook(payload: any, signature: string) {
  const settings = await getActivePaymentProvider();

  const webhookSecret = decrypt(settings.webhookSecretEncrypted);
  const isValid = verifyWebhookSignature(payload, signature, webhookSecret);

  if (!isValid) {
    await prisma.$queryRaw`
      UPDATE payment_provider_settings
      SET webhook_failures_count = webhook_failures_count + 1
      WHERE id = ${settings.id}::uuid
    `;

    throw new BadRequestException('Invalid webhook signature');
  }

  // Process webhook
}
```

**Result:**
- Fake webhooks rejected
- Failure count incremented
- Alert if failures > threshold

---

## Usage Guidelines

### Best Practices

1. **Pricing Changes:**
   - Always create NEW price versions (never edit existing)
   - Test on staging first
   - Announce to users in advance
   - Monitor subscriber counts after change

2. **User Overrides:**
   - Always set expiry date
   - Document reason clearly
   - Review overrides monthly
   - Remove expired/unused overrides

3. **Settings Updates:**
   - Test SMTP before activating
   - Test AI provider before setting as default
   - Keep backup configuration
   - Document all changes in notes field

4. **Message Templates:**
   - Preview in both languages before enabling
   - Test with sample data
   - Keep fallback templates active
   - Archive old templates (don't delete)

5. **AI Limits:**
   - Set conservative global defaults
   - Review usage stats weekly
   - Adjust limits based on actual usage
   - Use overrides sparingly

6. **Audit Logs:**
   - Review weekly for suspicious activity
   - Export monthly for compliance
   - Alert on sensitive actions
   - Rotate logs after 2 years

### Common Admin Tasks

**Monthly Checklist:**
- [ ] Review active user overrides
- [ ] Check AI usage stats and adjust limits
- [ ] Review message template performance
- [ ] Update publisher database
- [ ] Export audit logs for compliance
- [ ] Review webhook health
- [ ] Check payment provider status

**Weekly Checklist:**
- [ ] Review new signups
- [ ] Check subscription metrics
- [ ] Monitor AI costs
- [ ] Review failed emails (SMTP)
- [ ] Check tracking pixel health

**Daily Checklist:**
- [ ] Review dashboard metrics
- [ ] Check for failed webhooks
- [ ] Monitor AI provider status

---

## Security Checklist

Before launching admin panel:

- [ ] All admin routes protected with AdminGuard
- [ ] All sensitive data encrypted at rest
- [ ] All secrets masked in responses
- [ ] All admin actions audit-logged
- [ ] Rate limiting enabled on all endpoints
- [ ] CSRF protection enabled
- [ ] HTTPS enforced
- [ ] Admin users have strong passwords
- [ ] Admin sessions expire after inactivity
- [ ] No admin credentials in git history
- [ ] Webhook signatures verified
- [ ] Input sanitization on all forms
- [ ] XSS protection enabled
- [ ] SQL injection prevented (Prisma)
- [ ] No executable code in templates
- [ ] Test mode clearly indicated
- [ ] Production secrets different from staging

---

**Version:** 1.0.0
**Last Updated:** 2026-01-07
**Status:** Production-Ready
**Security Level:** Critical
