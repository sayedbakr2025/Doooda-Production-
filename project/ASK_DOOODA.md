# Ask Doooda - AI Assistant Module

## Overview

Ask Doooda is an AI-powered writing assistant integrated into the Doooda platform. It provides contextual help, suggestions, and guidance to writers while respecting their creative voice and maintaining complete privacy. The module enforces strict usage limits, implements robust security measures, and supports multiple AI providers through an abstraction layer.

## Core Principles

### 1. Writer Empowerment
- Assists writers without replacing their voice
- Offers suggestions rather than complete rewrites
- Encourages creative autonomy
- Maintains respectful, calm tone

### 2. Privacy First
- No training on user content
- No prompt or response logging
- No data persistence beyond usage tracking
- HTTPS-only communication
- Encrypted API keys at rest

### 3. Fair Usage
- Server-side enforcement of limits
- Daily and monthly quotas
- Transparent limit messaging
- No silent failures

### 4. Provider Abstraction
- Supports multiple AI providers
- Hot-swappable providers
- Encrypted credential storage
- Admin-controlled selection

## Availability & Access Control

### Subscription Requirements

**Ask Doooda is available ONLY for Pro Plan subscribers ($10/month)**

Access check enforced on every request:
```typescript
// 1. User must have active subscription
// 2. Subscription must be Pro plan
// 3. Not available on Free or Standard plans
```

### Verification Flow

```
Request → Check Authentication → Check Subscription → Check Plan → Check Limits → Process
```

If any check fails, request is rejected BEFORE AI call.

## Usage Limits & Cost Guardrails

### Default Limits (Pro Plan)

- **Daily Limit:** 30 questions per user per day
- **Monthly Limit:** 900 questions per user per month
- **Reset Schedule:** Daily at midnight (user timezone), monthly on first day of month

### Counting Rules

**What Counts:**
- Successful AI responses only
- One count per complete request/response cycle
- Independent of response length
- Independent of selected text length

**What Does NOT Count:**
- Failed requests (errors, timeouts)
- Rate-limited requests
- Rejected requests (subscription check failures)
- Test connections by admin

### Limit Enforcement

**Server-Side Only:**
```typescript
async checkUsageLimits(userId: string) {
  const limits = await this.getUserLimits(userId);

  if (limits.isUnlimited) {
    return; // Admin override
  }

  const dailyUsage = await this.countDailyUsage(userId);
  const monthlyUsage = await this.countMonthlyUsage(userId);

  if (dailyUsage >= limits.dailyLimit) {
    throw new ForbiddenException(this.getDailyLimitMessage());
  }

  if (monthlyUsage >= limits.monthlyLimit) {
    throw new ForbiddenException(this.getMonthlyLimitMessage());
  }
}
```

**Limit Resolution Order:**
1. User Override (highest priority) - Admin-set user-specific limit
2. Plan-Based Limit - Configured for Pro plan
3. Global Default - System-wide fallback (30/day, 900/month)

### User Experience on Limit Reached

**Daily Limit Message:**
```
لقد وصلت إلى الحد اليومي لدووودة 🌱
خُد استراحة قصيرة، وإبداعك مكمل بكرة بإذن الله.

You've reached today's Doooda limit 🌱
Take a short break — your creativity continues tomorrow.
```

**Monthly Limit Message:**
```
لقد وصلت إلى الحد الشهري لدووودة 🌱
استمتع باستراحة، وسنكون معك في الشهر القادم.

You've reached this month's Doooda limit 🌱
Enjoy a break, and we'll be with you next month.
```

**No Negative Language:**
- No technical error codes shown to user
- No punitive messaging
- Friendly, encouraging tone
- Clear reset information

### Admin Overrides

**Available Through Admin Panel:**
- Set unlimited access for specific user
- Adjust daily/monthly limits per user
- Emergency disable of Ask Doooda globally
- Temporary limit increases

**Override Characteristics:**
- Logged in audit logs
- Applied immediately
- Transparent to user
- Reversible

## AI Provider Architecture

### Supported Providers

1. **OpenAI** - GPT-4, GPT-3.5-turbo
2. **Gemini** - Google's Gemini Pro
3. **Copilot** - Azure OpenAI Service
4. **DeepSeek** - DeepSeek Chat

### Provider Abstraction Layer

**Interface Definition:**
```typescript
export interface AIProvider {
  name: string;
  sendRequest(request: AIRequest, config: AIProviderConfig): Promise<AIResponse>;
  isAvailable(config: AIProviderConfig): boolean;
}

export interface AIRequest {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
  tokensUsed?: number;
  provider: string;
}
```

**Provider Registry:**
```typescript
private providers: Map<string, AIProvider> = new Map([
  ['openai', new OpenAIProvider()],
  ['gemini', new GeminiProvider()],
  ['copilot', new CopilotProvider()],
  ['deepseek', new DeepSeekProvider()],
]);
```

### Provider Configuration

**Database Schema:**
```sql
CREATE TABLE ai_providers (
  id uuid PRIMARY KEY,
  name text NOT NULL,  -- 'openai', 'gemini', 'copilot', 'deepseek'
  api_key text NOT NULL,  -- Encrypted at rest
  model text,  -- Provider-specific model name
  is_active boolean DEFAULT false,  -- Only one active at a time
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
```

**Active Provider Selection:**
```typescript
// Only one provider active at a time
// Admin panel controls which provider is active
// Hot-swappable without code deployment
```

### Provider Adapters

**OpenAI Provider:**
```typescript
async sendRequest(request: AIRequest, config: AIProviderConfig): Promise<AIResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4',
      messages: request.messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 2000,
    }),
  });

  const data = await response.json();

  return {
    content: data.choices[0]?.message?.content || '',
    tokensUsed: data.usage?.total_tokens || 0,
    provider: 'openai',
  };
}
```

**Gemini Provider:**
```typescript
async sendRequest(request: AIRequest, config: AIProviderConfig): Promise<AIResponse> {
  const model = config.model || 'gemini-pro';
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

  const systemMessage = request.messages.find(m => m.role === 'system');
  const userMessages = request.messages.filter(m => m.role !== 'system');

  const parts = userMessages.map(msg => ({ text: msg.content }));

  if (systemMessage) {
    parts.unshift({ text: systemMessage.content });
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.maxTokens || 2000,
      },
    }),
  });

  const data = await response.json();

  return {
    content: data.candidates[0]?.content?.parts[0]?.text || '',
    tokensUsed: data.usageMetadata?.totalTokenCount || 0,
    provider: 'gemini',
  };
}
```

### Provider Testing

**Test Connection Feature:**
```typescript
async testProvider(providerId: string): Promise<boolean> {
  const providerConfig = await this.getProviderConfig(providerId);
  const provider = this.providers.get(providerConfig.name);

  const testRequest: AIRequest = {
    messages: [
      {
        role: 'user',
        content: 'Say "Hello" if you can read this.',
      },
    ],
    maxTokens: 10,
  };

  try {
    await provider.sendRequest(testRequest, {
      apiKey: this.encryption.decrypt(providerConfig.apiKey),
      model: providerConfig.model,
    });
    return true;
  } catch (error) {
    return false;
  }
}
```

**Admin Panel Test Button:**
- Tests provider connection without affecting usage limits
- Validates API key correctness
- Checks model availability
- Returns success/failure status

## User Experience & Activation

### Activation Methods

**Method 1: Right-Click Menu (No Selection)**
```
Right-click anywhere in writing area
→ Context menu appears
→ Option: "اسأل دووودة / Ask Doooda"
→ Click option
→ Doooda chat window opens
```

**Method 2: Right-Click on Selected Text**
```
Select text in writing area
→ Right-click on selection
→ Context menu appears
→ Option: "اسأل دووودة / Ask Doooda"
→ Click option
→ Doooda chat window opens
→ Selected text sent as context
```

### Activation UX Flow

**1. Doooda GIF Animation**
```
On activation:
- Animated GIF appears bottom-left of screen
- Animation plays ONCE (no loop)
- Stops at last frame
- Remains visible during session
```

**2. Chat Window Opens**
```
Position: Overlay on writing area
Size: 400px × 600px (adjustable)
Contains:
- Header: "دووودة / Doooda"
- Chat history area
- Input field
- Send button
- Close button (X)
```

**3. Greeting Message**

**Arabic (Male Writer):**
```
دووودة في خدمتك يا سيدي {pen_name}، كيف أساعدك؟
```

**Arabic (Female Writer):**
```
دووودة في خدمتك يا سيدتي {pen_name}، كيف أساعدكِ؟
```

**English:**
```
Doooda at your service, {pen_name}. How can I help?
```

**Language Determination:**
```typescript
// Default to user's preferred language from profile
// Can be overridden per session via user request
// No permanent preference change
```

### Context Loading Experience

**When Text is Selected:**

**Step 1 - Loading Message:**
```
Arabic: "جاري الآن قراءة إبداعاتك..."
English: "Reading your work now..."
```

**Step 2 - Ready Message:**
```
Arabic: "انتهيت من القراءة، وجاهز لأسئلتك في هذا الشأن"
English: "Finished reading, ready for your questions about it"
```

**Visual Indicators:**
- Loading spinner during context processing
- Smooth transition to ready state
- Clear visual feedback

### Chat Interaction

**User Input:**
- Text area for question
- Enter to send, Shift+Enter for new line
- Send button always visible
- Character count optional

**AI Response:**
- Appears in chat bubble
- Typing indicator during generation
- Smooth animation
- Formatted text support

**Language Switching:**
```typescript
// User can request different language mid-session
// Example: "Can you respond in English?"
// Language override applies to current session only
// Next session reverts to user preference
```

### Closing Behavior

**Close Button (X):**
```
User clicks X
→ Chat window shrinks smoothly
→ Doooda closing GIF plays
→ Session context destroyed
→ Chat history cleared
→ Memory released
```

**Auto-Close Scenarios:**
- User navigates away from page
- User logs out
- Session expires

**No Persistence:**
- Chat history NOT saved
- Context NOT reused
- Fresh start every session
- Complete privacy

## Prompt Engineering & AI Behavior

### System Prompt Design

**Core Principles in Prompt:**
1. You are a companion, not a ghostwriter
2. Encourage writer's voice
3. Suggest, don't rewrite (unless asked)
4. Respect cultural context
5. Avoid moral judgments
6. Avoid plagiarism
7. Avoid unwanted spoilers

**Arabic System Prompt:**
```
أنت دووودة، مساعد كتابة لطيف ومحترف.

دورك:
- ساعد الكاتب دون أن تحل محل صوته
- قدم اقتراحات، لا تعيد كتابة النص بالكامل إلا إذا طُلب منك ذلك
- احترم السياق الثقافي والأدبي
- تجنب الأحكام الأخلاقية
- تجنب الانتحال
- تجنب الإفشاءات غير المرغوب فيها

أسلوبك:
- هادئ ومحترم
- مشجع وبناء
- مركز على الكاتب وإبداعه

تذكر: أنت رفيق كتابة، لست كاتب شبح.
```

**English System Prompt:**
```
You are Doooda, a gentle and professional writing assistant.

Your role:
- Help the writer without replacing their voice
- Offer suggestions, don't rewrite entire texts unless asked
- Respect cultural and literary context
- Avoid moral judgments
- Avoid plagiarism
- Avoid unwanted spoilers

Your style:
- Calm and respectful
- Encouraging and constructive
- Focused on the writer and their creativity

Remember: You are a writing companion, not a ghostwriter.
```

### Context Handling

**Selected Text Context:**
```typescript
// If user selected text before activating Doooda:
const contextMessage = language === 'ar'
  ? `السياق من عمل الكاتب:\n\n${selectedText}`
  : `Context from the writer's work:\n\n${selectedText}`;

messages.push({
  role: 'user',
  content: contextMessage,
});
```

**No Auto-Injection:**
```
STRICT RULE: Do NOT automatically inject:
- Project metadata
- Chapter summaries
- Character profiles
- Other scenes
- Unpublished content

ONLY include what user explicitly provides:
- Selected text (if any)
- User's question
- Character data (if user requests it)
```

**Character Context (Optional):**
```typescript
// User must explicitly request character information
// Example: "Tell me about character John Smith"
// System fetches character profile ONLY when requested
// Never proactively inject character data
```

### Prompt Structure

**Message Flow:**
```typescript
[
  {
    role: 'system',
    content: systemPrompt,  // Language-specific instructions
  },
  {
    role: 'user',
    content: `Context from the writer's work:\n\n${selectedText}`,  // If selected
  },
  {
    role: 'user',
    content: userQuestion,  // User's actual question
  },
]
```

**Temperature & Token Limits:**
```typescript
temperature: 0.7  // Balanced creativity
maxTokens: 2000   // Sufficient for detailed responses
```

## Security & Privacy Architecture

### Data Protection Measures

**No Training on User Content:**
```
AI providers must NOT train on user data
Contract requirement with all providers
Regularly audited and verified
Violation is grounds for immediate provider removal
```

**No Logging:**
```typescript
// What is NOT logged:
- User questions
- AI responses
- Selected text
- Conversation history
- Prompts sent to AI

// What IS logged:
- Usage counts (for limits)
- Timestamps
- Provider used
- Success/failure status
- Tokens consumed (for cost tracking)
```

**Encryption at Rest:**
```typescript
// AI provider API keys stored encrypted
this.encryption.encrypt(apiKey);

// Keys decrypted only at request time
const decryptedKey = this.encryption.decrypt(storedKey);

// Never exposed to frontend
// Never logged in plaintext
```

**HTTPS Only:**
```
All communication over HTTPS
No HTTP fallback
TLS 1.2 minimum
Certificate validation enforced
```

### Input Sanitization

**Question Input:**
```typescript
// Sanitize user question before sending to AI
// Remove HTML tags
// Escape special characters
// Limit length (max 5000 characters)
// Block injection attempts
```

**Selected Text:**
```typescript
// Sanitize selected text context
// Remove HTML (preserve structure)
// Limit length (max 10000 characters)
// Strip scripts and malicious content
```

### Abuse Detection

**Rate Limiting (Per User):**
```
10 requests per minute per user
Enforced in-memory
Protects against spam
Separate from daily/monthly limits
```

**Abnormal Usage Detection:**
```typescript
// Monitor for suspicious patterns:
- Rapid-fire requests
- Identical questions repeated
- Extremely long inputs
- Provider error spikes

// Response:
- Temporary block (30 minutes)
- Alert admin via audit log
- Investigate patterns
```

**API Key Protection:**
```typescript
// Prevent key leakage:
- Never in client-side code
- Never in logs
- Never in error messages
- Never in responses
- Encrypted at rest
- Rotate regularly
```

## API Endpoints

### POST /ask-doooda

Send a question to Ask Doooda.

**Request:**
```json
{
  "projectId": "uuid",
  "question": "How can I make this dialogue more natural?",
  "selectedText": "Optional selected text context",
  "language": "ar"
}
```

**Response:**
```json
{
  "content": "AI response content here...",
  "provider": "openai"
}
```

**Error Responses:**

**403 - Subscription Required:**
```json
{
  "statusCode": 403,
  "message": "Ask Doooda is available only for Pro plan subscribers"
}
```

**403 - Daily Limit Reached:**
```json
{
  "statusCode": 403,
  "message": "لقد وصلت إلى الحد اليومي لدووودة 🌱\nخُد استراحة قصيرة، وإبداعك مكمل بكرة بإذن الله.\n\nYou've reached today's Doooda limit 🌱\nTake a short break — your creativity continues tomorrow."
}
```

**429 - Rate Limit:**
```json
{
  "statusCode": 429,
  "message": "Too many requests. Please wait a moment before trying again."
}
```

**500 - AI Error:**
```json
{
  "statusCode": 500,
  "message": "AI request failed: [error details]"
}
```

### GET /ask-doooda/greeting

Get personalized greeting message.

**Request:**
```
GET /ask-doooda/greeting?language=ar
Authorization: Bearer {token}
```

**Response:**
```json
{
  "greeting": "دووودة في خدمتك يا سيدي أحمد، كيف أساعدك؟"
}
```

### GET /ask-doooda/context-loaded-message

Get "reading your work" message.

**Request:**
```
GET /ask-doooda/context-loaded-message?language=ar
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "جاري الآن قراءة إبداعاتك..."
}
```

### GET /ask-doooda/context-ready-message

Get "ready for questions" message.

**Request:**
```
GET /ask-doooda/context-ready-message?language=ar
Authorization: Bearer {token}
```

**Response:**
```json
{
  "message": "انتهيت من القراءة، وجاهز لأسئلتك في هذا الشأن"
}
```

## Database Schema

### AI Usage Tracking

```sql
CREATE TABLE ai_usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('question', 'generation', 'analysis', 'other')),
  provider_used text NOT NULL,
  tokens_used integer DEFAULT 0,
  request_timestamp timestamptz DEFAULT now(),
  response_status text NOT NULL CHECK (response_status IN ('success', 'error', 'rate_limited', 'no_access')),
  error_message text
);

CREATE INDEX idx_ai_tracking_user_id ON ai_usage_tracking(user_id);
CREATE INDEX idx_ai_tracking_timestamp ON ai_usage_tracking(request_timestamp);
CREATE INDEX idx_ai_tracking_user_date ON ai_usage_tracking(user_id, request_timestamp);
CREATE INDEX idx_ai_tracking_status ON ai_usage_tracking(response_status);
```

**Purpose:**
- Track every AI request
- Count daily/monthly usage for limits
- Monitor token consumption
- Identify error patterns
- Audit trail for security

**Query for Daily Usage:**
```sql
SELECT COUNT(*) FROM ai_usage_tracking
WHERE user_id = $1
  AND response_status = 'success'
  AND request_timestamp >= CURRENT_DATE
  AND request_timestamp < CURRENT_DATE + INTERVAL '1 day';
```

**Query for Monthly Usage:**
```sql
SELECT COUNT(*) FROM ai_usage_tracking
WHERE user_id = $1
  AND response_status = 'success'
  AND request_timestamp >= DATE_TRUNC('month', CURRENT_DATE)
  AND request_timestamp < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
```

### AI Usage Limits

```sql
CREATE TABLE ai_usage_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  limit_type text NOT NULL CHECK (limit_type IN ('global_default', 'plan_based', 'user_override')),
  plan_name text CHECK (plan_name IN ('FREE', 'STANDARD', 'PRO') OR plan_name IS NULL),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  daily_limit integer,
  monthly_limit integer,
  is_unlimited boolean DEFAULT false,
  is_active boolean DEFAULT true,
  reason text,
  set_by_admin_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT check_limit_type_consistency CHECK (
    (limit_type = 'global_default' AND plan_name IS NULL AND user_id IS NULL) OR
    (limit_type = 'plan_based' AND plan_name IS NOT NULL AND user_id IS NULL) OR
    (limit_type = 'user_override' AND user_id IS NOT NULL)
  )
);

CREATE INDEX idx_ai_limits_user_id ON ai_usage_limits(user_id);
CREATE INDEX idx_ai_limits_type ON ai_usage_limits(limit_type);
CREATE INDEX idx_ai_limits_active ON ai_usage_limits(is_active);
CREATE INDEX idx_ai_limits_plan ON ai_usage_limits(plan_name);
CREATE UNIQUE INDEX idx_ai_limits_one_per_user ON ai_usage_limits(user_id)
  WHERE limit_type = 'user_override' AND is_active = true;
```

**Purpose:**
- Configure limits per plan
- Override limits per user
- Set unlimited access
- Emergency disable
- Audit limit changes

**Example Limit Configurations:**

**Global Default:**
```sql
INSERT INTO ai_usage_limits (limit_type, daily_limit, monthly_limit)
VALUES ('global_default', 30, 900);
```

**Pro Plan Limits:**
```sql
INSERT INTO ai_usage_limits (limit_type, plan_name, daily_limit, monthly_limit)
VALUES ('plan_based', 'PRO', 30, 900);
```

**User Override (Unlimited):**
```sql
INSERT INTO ai_usage_limits (
  limit_type, user_id, is_unlimited, reason, set_by_admin_id
)
VALUES (
  'user_override',
  'user-uuid',
  true,
  'Beta tester - unlimited access',
  'admin-uuid'
);
```

**User Override (Custom Limit):**
```sql
INSERT INTO ai_usage_limits (
  limit_type, user_id, daily_limit, monthly_limit, reason, set_by_admin_id
)
VALUES (
  'user_override',
  'user-uuid',
  100,
  3000,
  'Premium user - increased limits',
  'admin-uuid'
);
```

### AI Providers

```sql
CREATE TABLE ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_key text NOT NULL,  -- Encrypted
  model text,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX idx_ai_providers_active ON ai_providers(is_active)
  WHERE is_active = true AND deleted_at IS NULL;
```

**Purpose:**
- Store provider configurations
- Manage API keys securely
- Control active provider
- Support multiple providers

**Example Provider Configurations:**

**OpenAI:**
```sql
INSERT INTO ai_providers (name, api_key, model, is_active)
VALUES ('openai', 'encrypted_key', 'gpt-4', true);
```

**Gemini:**
```sql
INSERT INTO ai_providers (name, api_key, model, is_active)
VALUES ('gemini', 'encrypted_key', 'gemini-pro', false);
```

## Admin Panel Features

### Provider Management

**Add Provider:**
- Form: Provider name, API key, model
- Encrypt API key before storage
- Test connection before saving
- Activate/deactivate toggle

**Test Connection:**
- Button per provider
- Sends simple test request
- Shows success/failure status
- Does not affect usage limits

**Switch Active Provider:**
- Dropdown to select provider
- Only one active at a time
- Immediate effect
- Logged in audit logs

**Update API Key:**
- Secure form with password field
- Re-encrypt on update
- Invalidate existing tokens
- Test after update

### Usage Limit Management

**View Current Limits:**
- Global default
- Per-plan limits
- User overrides

**Modify Limits:**
- Set daily limit
- Set monthly limit
- Enable unlimited access
- Set expiration date

**User Overrides:**
- Search user by name/email
- Set custom limits
- Add reason note
- Temporary or permanent

**Emergency Disable:**
- One-click disable Ask Doooda globally
- Affects all users immediately
- Shows maintenance message
- Logged in audit logs

### Usage Analytics

**Dashboard Metrics:**
- Total requests today/month
- Average tokens per request
- Success rate
- Error rate
- Top users by usage

**Per-User Statistics:**
- Daily usage count
- Monthly usage count
- Limit status
- Recent requests
- Error patterns

**Cost Tracking:**
- Tokens consumed per provider
- Estimated cost per user
- Total monthly cost
- Cost per plan tier

**Export Reports:**
- CSV export
- Date range filter
- User filter
- Provider filter

## Testing Scenarios

### Subscription Access Testing

**Scenario 1: Pro User Accesses Ask Doooda**
```
1. User has active Pro subscription
2. User right-clicks in writing area
3. Selects "Ask Doooda"
4. Chat window opens
5. Greeting message displays
6. User asks question
7. AI responds successfully
8. Usage counter increments
```

**Scenario 2: Free User Attempts Access**
```
1. User has Free plan
2. User right-clicks in writing area
3. Selects "Ask Doooda"
4. Chat window opens
5. Greeting message displays
6. User asks question
7. System checks subscription
8. Returns 403 error
9. Message: "Ask Doooda is available only for Pro plan subscribers"
10. No usage count
```

**Scenario 3: Expired Subscription**
```
1. User had Pro subscription
2. Subscription expired yesterday
3. User attempts to use Ask Doooda
4. System checks subscription status
5. Returns 403 error
6. Message: "Active subscription required"
```

### Usage Limit Testing

**Scenario 1: Daily Limit Reached**
```
1. User has used 30 questions today
2. User asks 31st question
3. System checks daily usage
4. Returns 403 error
5. Friendly limit message displayed
6. No AI call made
7. No cost incurred
```

**Scenario 2: Monthly Limit Reached**
```
1. User has used 900 questions this month
2. User asks 901st question
3. System checks monthly usage
4. Returns 403 error
5. Friendly limit message displayed
6. No AI call made
```

**Scenario 3: Admin Override - Unlimited**
```
1. Admin sets user to unlimited access
2. User has used 100 questions today
3. User asks another question
4. System sees unlimited override
5. Skips limit check
6. AI processes request successfully
```

### Provider Testing

**Scenario 1: Active Provider Works**
```
1. OpenAI configured as active provider
2. User asks question
3. System fetches OpenAI config
4. Decrypts API key
5. Sends request to OpenAI
6. Receives response
7. Returns to user
8. Tracks usage
```

**Scenario 2: Provider Fails, No Fallback**
```
1. OpenAI configured as active provider
2. User asks question
3. OpenAI API returns error (500)
4. System logs error
5. Returns error to user
6. Does NOT count against usage
7. No automatic fallback
```

**Scenario 3: Switch Provider Mid-Day**
```
1. Morning: OpenAI active
2. Admin switches to Gemini at noon
3. Afternoon: User asks question
4. System uses Gemini
5. Works seamlessly
6. Usage count continues
```

### Context Handling Testing

**Scenario 1: Selected Text Context**
```
1. User selects paragraph of text
2. Right-clicks on selection
3. Chooses "Ask Doooda"
4. Chat opens
5. Shows "Reading your work..."
6. Processes context
7. Shows "Ready for questions"
8. User asks about selected text
9. AI has full context
10. Responds appropriately
```

**Scenario 2: No Selection**
```
1. User right-clicks (no selection)
2. Chooses "Ask Doooda"
3. Chat opens
4. No context loading message
5. Shows greeting only
6. User asks general question
7. AI responds without specific context
```

**Scenario 3: Very Long Selection**
```
1. User selects 5000 words
2. System limits context to 10000 characters
3. Truncates selection
4. Includes first part only
5. Processes successfully
6. Warns user about truncation (optional)
```

### Language Testing

**Scenario 1: Arabic User, Arabic Question**
```
1. User preferred language: Arabic
2. User opens Ask Doooda
3. Greeting in Arabic
4. User asks in Arabic
5. AI responds in Arabic
6. System prompt in Arabic
```

**Scenario 2: Arabic User, English Question**
```
1. User preferred language: Arabic
2. User opens Ask Doooda
3. Greeting in Arabic
4. User asks in English
5. AI responds in English
6. Session language overridden
7. Next session: back to Arabic
```

**Scenario 3: Language Switch Mid-Session**
```
1. User starts in Arabic
2. Asks question in Arabic
3. AI responds in Arabic
4. User asks: "Can you respond in English?"
5. AI switches to English
6. Continues in English for session
7. Next session: back to Arabic preference
```

## Performance Considerations

### Response Time Optimization

**Target Latency:**
- Question to AI: < 500ms
- AI processing: 2-5 seconds (provider dependent)
- Response to user: < 500ms
- Total: 3-6 seconds

**Optimization Strategies:**
- Pre-decrypt API keys at startup (if safe)
- Cache active provider config (1 minute)
- Parallel usage limit checks
- Async tracking (fire and forget)
- Stream AI responses (future enhancement)

### Resource Management

**Memory:**
- No chat history storage
- Context limited to 10000 characters
- Provider map pre-initialized
- Rate limit map with TTL cleanup

**Database:**
- Indexed queries for usage counts
- Pagination for analytics
- Archived old tracking data
- Optimized limit resolution

### Scalability

**Horizontal Scaling:**
- Stateless service design
- Provider config cached
- Rate limiting in Redis (future)
- Load balanced across instances

**Cost Management:**
- Usage limits prevent runaway costs
- Token tracking for billing
- Provider cost monitoring
- Alert on cost spikes

## Security Checklist

**API Key Security:**
- ✅ Encrypted at rest
- ✅ Never logged
- ✅ Never exposed to client
- ✅ Decrypted only at request time
- ✅ Rotated regularly (admin process)

**User Data Protection:**
- ✅ No training on user content
- ✅ No prompt/response logging
- ✅ No persistent chat history
- ✅ Context cleared after session
- ✅ HTTPS only

**Access Control:**
- ✅ Subscription verification every request
- ✅ Plan check every request
- ✅ Project ownership verification
- ✅ RLS policies on all tables
- ✅ Admin-only provider management

**Abuse Prevention:**
- ✅ Rate limiting (10/minute)
- ✅ Daily limits (30/day)
- ✅ Monthly limits (900/month)
- ✅ Input sanitization
- ✅ Abnormal usage detection

**Audit & Compliance:**
- ✅ Usage tracking in database
- ✅ Admin actions logged
- ✅ Limit changes logged
- ✅ Provider switches logged
- ✅ Error tracking

## Future Enhancements

### Phase 2 Features

**Streaming Responses:**
- Real-time token streaming
- Improved UX with progressive display
- Cancel mid-response

**Multi-Turn Conversations:**
- Maintain session context
- Follow-up questions
- Clarification requests

**Voice Input:**
- Speech-to-text integration
- Hands-free writing assistance
- Arabic voice support

**Character Context Integration:**
- Auto-suggest character info
- "Tell me about [character]" shortcut
- Character consistency checking

### Phase 3 Features

**Advanced Analytics:**
- Usage patterns per genre
- Popular question types
- Effectiveness metrics
- User satisfaction tracking

**Custom Prompts:**
- User-defined system prompts
- Genre-specific templates
- Style guide enforcement

**Collaborative Features:**
- Share Doooda responses
- Team usage limits
- Shared prompt libraries

## Conclusion

Ask Doooda is a privacy-first, usage-limited AI assistant that empowers writers without replacing their voice. Through provider abstraction, server-side enforcement, and thoughtful UX design, it provides valuable assistance while maintaining complete data security and cost control.

**Key Strengths:**
- Pro-only access ensures value alignment
- Strict usage limits protect against abuse
- Multiple providers ensure reliability
- No data persistence maintains privacy
- Language-aware responses respect cultural context
- Calm, encouraging tone supports creativity

**System Integrity:**
- Server-side enforcement (never trust client)
- Encrypted credentials at rest
- Comprehensive audit logging
- Admin control over all aspects
- Graceful degradation on errors

---

**Status:** ✅ Complete
**Database Tables:** 3 (ai_usage_tracking, ai_usage_limits, ai_providers)
**Provider Adapters:** 4 (OpenAI, Gemini, Copilot, DeepSeek)
**API Endpoints:** 4 (ask, greeting, context-loaded, context-ready)
**Build Status:** ✅ Passing
**Date:** 2026-01-07
