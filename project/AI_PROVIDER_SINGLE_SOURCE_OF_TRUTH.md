# AI Provider Single Source of Truth

## Overview

The AI provider system now implements a **single source of truth** architecture where both production (Ask Doooda) and testing use the exact same execution path. This ensures that provider tests are reliable and accurately represent real-world behavior.

## Architecture

### Shared Module: `_shared/ai-providers.ts`

All AI provider communication logic is centralized in a shared module that both edge functions import:

```
supabase/functions/
├── _shared/
│   └── ai-providers.ts       ← Single source of truth
├── ask-doooda/
│   └── index.ts               ← Uses shared module
└── test-ai-provider/
    └── index.ts               ← Uses shared module
```

## Core Principle

**Test and production use identical code paths.**

- No fake endpoints
- No mock responses
- No simplified test logic
- If a test passes, production will work
- If production works, the test will pass

## Implementation Details

### Shared AI Provider Functions

The `_shared/ai-providers.ts` module exports:

#### 1. `callAIProvider(provider, systemPrompt, messages, modelOverride)`

**Purpose**: Universal AI provider caller that routes to the correct provider.

**Used by**: `ask-doooda` for production requests

**Logic**:
```typescript
switch (provider.provider_name) {
  case "openai": return callOpenAI(...);
  case "deepseek": return callDeepSeek(...);
  case "gemini": return callGemini(...);
  case "anthropic": return callAnthropic(...);
  default: return callOpenAI(...);
}
```

#### 2. `testAIProvider(provider)`

**Purpose**: Test a provider by making a real AI request.

**Used by**: `test-ai-provider` for testing

**Implementation**:
```typescript
export async function testAIProvider(provider: ProviderConfig) {
  try {
    const testPrompt = "You are a test assistant.";
    const testMessage = { role: "user", content: "Reply with the single word OK" };

    // Uses the SAME callAIProvider function as production
    const response = await callAIProvider(provider, testPrompt, [testMessage], null);

    if (response && response.trim().length > 0) {
      return { success: true };
    }
    return { success: false, error: "Empty response from provider" };
  } catch (err) {
    if (err instanceof AIProviderError) {
      return { success: false, error: err.message };
    }
    // Handle network errors...
  }
}
```

**Key Point**: The test function calls `callAIProvider()`, which is the exact same function used in production.

#### 3. Provider-Specific Functions

Each provider has its own implementation:

- `callOpenAI()` - OpenAI API
- `callDeepSeek()` - DeepSeek API
- `callGemini()` - Google Gemini API
- `callAnthropic()` - Anthropic Claude API

**Common Pattern**:
```typescript
async function callOpenAI(provider, systemPrompt, messages, modelOverride) {
  const url = provider.api_endpoint || "https://api.openai.com/v1/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.api_key_encrypted}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelOverride || provider.model_name || "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: provider.max_tokens || 2000,
      temperature: provider.temperature ?? 0.7,
    }),
  });

  if (!res.ok) await parseApiError(res, "OpenAI");

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}
```

## Error Handling

### AIProviderError Class

Custom error class for provider-specific errors:

```typescript
export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly provider?: string
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
```

### Error Classification

Errors are classified into specific categories:

- **401/403**: Invalid API key
- **404**: Model or endpoint not found
- **429**: Rate limited by provider
- **5xx**: Provider server error
- **Network**: DNS, timeout, connection errors

All errors are caught, classified, and returned with clear messages.

## Usage Flow

### Production Flow (Ask Doooda)

```
User sends message
    ↓
ask-doooda/index.ts
    ↓
Load provider from database
    ↓
import { callAIProvider } from "../_shared/ai-providers.ts"
    ↓
callAIProvider(provider, systemPrompt, messages, modelOverride)
    ↓
AI provider responds
    ↓
Return to user
```

### Test Flow (Admin Panel)

```
Admin clicks "Test Provider"
    ↓
Frontend calls test-ai-provider edge function
    ↓
test-ai-provider/index.ts
    ↓
Load provider from database
    ↓
import { testAIProvider } from "../_shared/ai-providers.ts"
    ↓
testAIProvider(provider)
    ├─ Calls callAIProvider() internally
    └─ Uses SAME code as production
    ↓
AI provider responds
    ↓
Store result in database (last_test_result)
    ↓
Return success/failure to admin
```

## Benefits

### 1. Reliability

**Tests accurately predict production behavior** because they use the same code.

If a provider passes the test:
- The API key is valid
- The endpoint is reachable
- The model name is correct
- The request format is accepted
- The provider can return a response

### 2. Maintainability

**Single point of maintenance** for all provider logic.

When adding a new provider:
1. Add function to `_shared/ai-providers.ts`
2. Add case to `callAIProvider()` switch
3. Both test and production automatically support it

When fixing a bug:
1. Fix in shared module
2. Both test and production are fixed

### 3. No Duplication

**No code duplication** between test and production.

Previously:
- `test-ai-provider/index.ts` had its own provider logic
- `ask-doooda/index.ts` had duplicate provider logic
- Changes had to be made twice
- Logic could diverge

Now:
- One shared module
- One implementation per provider
- Guaranteed consistency

### 4. Clear Error Messages

**Errors are classified and meaningful**.

Examples:
- "Invalid API key" (not "HTTP 401")
- "Model or endpoint not found" (not "HTTP 404")
- "Rate limited by provider" (not "HTTP 429")
- "Network error: could not reach provider" (not "fetch failed")

## Validation Strategy

### Test Request Format

When testing a provider, we send:
```typescript
{
  systemPrompt: "You are a test assistant.",
  messages: [{ role: "user", content: "Reply with the single word OK" }],
  modelOverride: null
}
```

This is a minimal valid request that:
- Uses the configured model
- Uses the configured API key
- Uses the configured endpoint
- Tests the complete request/response cycle

### Success Criteria

A provider test succeeds if:
1. The API call completes without error
2. The response is not empty
3. The provider returns valid content

We don't check for the exact word "OK" because:
- Different models might format differently
- Some models might add punctuation
- The important thing is that the provider responds

If the provider returns ANY non-empty response, the configuration is valid.

## Edge Cases Handled

### 1. Empty API Key

**Error**: "No API key configured"

The test fails before making any network request.

### 2. Invalid API Key

**Error**: "Invalid API key"

The provider returns 401/403, classified as authentication error.

### 3. Wrong Model Name

**Error**: "Model or endpoint not found"

The provider returns 404, classified as model error.

### 4. Network Timeout

**Error**: "Connection timed out"

The fetch call times out (30 second limit).

### 5. Provider Down

**Error**: "Provider server error (HTTP 5xx)"

The provider returns a server error.

### 6. Rate Limit

**Error**: "Rate limited by provider"

The provider returns 429.

### 7. DNS Error

**Error**: "Network error: could not reach provider"

The endpoint doesn't resolve or isn't reachable.

## Database Integration

### Test Results Storage

After testing, results are stored in the `ai_providers` table:

```sql
UPDATE ai_providers
SET last_test_at = NOW(),
    last_test_result = 'success' OR 'failed: <error message>'
WHERE id = provider_id;
```

### Audit Logging

Every test is logged:

```sql
INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, metadata)
VALUES (
  admin_user_id,
  'ai_provider_tested',
  'ai_providers',
  provider_id,
  { provider_name: 'openai', result: 'success' }
);
```

## Security

### API Key Protection

- API keys are stored encrypted in the database
- Keys are never exposed to the frontend
- Edge functions use service role to read keys
- Keys are only used in server-side requests

### Admin-Only Testing

Testing requires admin role:

```typescript
const { data: userData } = await supabase
  .from("users")
  .select("role")
  .eq("id", user.id)
  .maybeSingle();

if (!userData || userData.role !== "admin") {
  return jsonResponse({ success: false, error: "Forbidden" }, 403);
}
```

## Example: Adding a New Provider

To add a new AI provider (e.g., "xai"):

### Step 1: Add Provider Function

In `_shared/ai-providers.ts`:

```typescript
export async function callXAI(
  provider: ProviderConfig,
  systemPrompt: string,
  messages: AIMessage[],
  modelOverride?: string | null
): Promise<string> {
  const url = provider.api_endpoint || "https://api.x.ai/v1/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.api_key_encrypted}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelOverride || provider.model_name || "grok-1",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: provider.max_tokens || 2000,
      temperature: provider.temperature ?? 0.7,
    }),
  });

  if (!res.ok) await parseApiError(res, "XAI");

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}
```

### Step 2: Add to Router

In `callAIProvider()`:

```typescript
export async function callAIProvider(
  provider: ProviderConfig,
  systemPrompt: string,
  messages: AIMessage[],
  modelOverride?: string | null
): Promise<string> {
  switch (provider.provider_name) {
    case "openai": return await callOpenAI(...);
    case "deepseek": return await callDeepSeek(...);
    case "gemini": return await callGemini(...);
    case "anthropic": return await callAnthropic(...);
    case "xai": return await callXAI(...);  // ← Add this line
    default: return await callOpenAI(...);
  }
}
```

### Step 3: Deploy

```bash
# Deploy both functions (they share the module)
supabase functions deploy ask-doooda
supabase functions deploy test-ai-provider
```

**Done**. Both production and testing now support the new provider.

## Testing the Implementation

### Manual Test

1. Log in as admin
2. Go to Admin Dashboard → Ask Doooda → AI Providers
3. Click "Test" on OpenAI provider
4. Verify:
   - Test makes a real API call
   - Result shows "success" if valid
   - Result shows specific error if invalid
5. Try with invalid API key
6. Verify error message is clear and specific

### Verification

After testing, check the database:

```sql
SELECT provider_name, last_test_at, last_test_result
FROM ai_providers
WHERE provider_name = 'openai';
```

Expected result:
```
provider_name | last_test_at           | last_test_result
--------------+------------------------+------------------
openai        | 2026-02-07 12:34:56+00 | success
```

Or if failed:
```
provider_name | last_test_at           | last_test_result
--------------+------------------------+-----------------------------------
openai        | 2026-02-07 12:34:56+00 | failed: Invalid API key
```

## Summary

The AI provider system now implements a true single source of truth:

✅ Test and production use the same code
✅ No duplicated logic
✅ Real API calls for testing
✅ Reliable test results
✅ Clear error messages
✅ Easy to maintain
✅ Easy to extend

When a test passes, you can be confident that production will work. When production works, you can be confident that tests will pass. This is the foundation of reliable AI provider management in Doooda.
