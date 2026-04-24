# AI Provider Connection Testing

## Overview

Real backend-level AI provider connection testing validates API keys, base URLs, and models through actual API calls to each provider's service. This ensures provider configuration is correct and ready for production use.

**Status**: Fully implemented and operational. No mock responses, no fake success, real API validation only.

## Architecture

### Test Flow

```
Admin clicks "Test" → Frontend calls Edge Function → Edge Function makes real API request → Provider responds → Result stored in database → UI shows result
```

### Security

**Server-Side Only**: All API calls are made from Supabase Edge Functions. API keys are never sent to the frontend or exposed in logs.

**Admin-Only Access**: Only users with `role = 'admin'` can trigger tests.

**No User Impact**: Tests do NOT:
- Affect Ask Doooda functionality
- Consume user limits or quotas
- Trigger analytics or tracking
- Depend on user plans or subscriptions

### Isolation

Tests are completely isolated from production features. They validate infrastructure readiness without any coupling to Ask Doooda or other AI-powered features.

## Implementation

### Edge Function: test-ai-provider

**Location**: `supabase/functions/test-ai-provider/index.ts`

**Purpose**: Execute real provider test and store results

**Authentication**:
1. Validates JWT token from request
2. Confirms user exists in `auth.users`
3. Verifies user has `role = 'admin'`
4. Returns 401 for unauthenticated requests
5. Returns 403 for non-admin users

**Process**:
1. Receive `provider_id` in request body
2. Query `ai_providers` table using service role (to access API keys)
3. Extract provider configuration (name, key, endpoint, model)
4. Call `testAIProvider()` function with configuration
5. Store result in `last_test_at` and `last_test_result` columns
6. Log to `audit_logs` table
7. Return success/failure to frontend

**Response Format**:

Success:
```json
{
  "success": true,
  "result": "success"
}
```

Failure:
```json
{
  "success": false,
  "error": "Unauthorized - Invalid or missing API key"
}
```

### Shared Module: ai-providers.ts

**Location**: `supabase/functions/_shared/ai-providers.ts`

**Exports**:
- `callOpenAI()` - OpenAI API integration
- `callDeepSeek()` - DeepSeek API integration
- `callGemini()` - Google Gemini API integration
- `callAnthropic()` - Anthropic Claude API integration
- `callAIProvider()` - Router function to correct provider
- `testAIProvider()` - Test function with error handling

### Test Request

**Minimal Test Payload**:
```typescript
{
  system: "You are a test assistant.",
  messages: [
    { role: "user", content: "Reply with the single word OK" }
  ]
}
```

This minimal request:
- Uses minimal tokens (cost-effective)
- Validates authentication
- Validates model access
- Validates endpoint reachability
- Returns quickly (no complex generation)

**Timeout Protection**: 30 seconds per request. If provider doesn't respond within 30 seconds, test fails with timeout error.

## Error Handling

### Error Classification

All errors are classified into specific, actionable categories:

#### 1. Authentication Errors (401)

**Error**: `"Unauthorized - Invalid or missing API key"`

**Causes**:
- API key is incorrect
- API key is expired
- API key is revoked

**Admin Action**:
- Update API key in provider settings
- Generate new key from provider dashboard
- Verify key has correct format

#### 2. Permission Errors (403)

**Error**: `"Forbidden - Insufficient quota or billing not enabled"`

**Causes**:
- Provider account has no credits
- Billing is not enabled
- Free tier exhausted

**Error**: `"Forbidden - API key lacks required permissions"`

**Causes**:
- API key doesn't have chat/completion permissions
- Key is restricted to specific models
- Key has IP restrictions

**Error**: `"Forbidden - Access denied"`

**Causes**:
- Generic permission issue
- Account suspended
- Regional restrictions

**Admin Action**:
- Check provider billing dashboard
- Enable billing/add payment method
- Verify API key permissions
- Check account status

#### 3. Not Found Errors (404)

**Error**: `"Invalid model - Model name not found or not available"`

**Causes**:
- Model name is misspelled
- Model doesn't exist for this provider
- Model requires special access/waitlist

**Error**: `"Not found - Invalid endpoint or resource"`

**Causes**:
- Custom endpoint URL is incorrect
- Endpoint path is wrong
- Provider API changed

**Admin Action**:
- Verify model name in provider documentation
- Check model availability for account
- Correct base URL if using custom endpoint
- Use default endpoint instead

#### 4. Rate Limit Errors (429)

**Error**: `"Rate limited - Too many requests to provider"`

**Causes**:
- Testing too frequently
- Provider rate limits exceeded
- Account tier has low rate limits

**Admin Action**:
- Wait before retesting
- Upgrade provider account tier
- Check provider rate limit documentation

#### 5. Bad Request Errors (400)

**Error**: `"Bad request - [specific error from provider]"`

**Causes**:
- Invalid parameter values
- Malformed request
- Model requires specific parameters

**Admin Action**:
- Review provider documentation
- Check temperature, max_tokens values
- Verify model supports requested features

#### 6. Server Errors (500+)

**Error**: `"Provider server error - Service temporarily unavailable"`

**Causes**:
- Provider is experiencing outages
- Provider maintenance
- Provider infrastructure issues

**Admin Action**:
- Check provider status page
- Wait and retry later
- Use alternative provider

#### 7. Network Errors

**Error**: `"Connection timed out after 30 seconds"`

**Causes**:
- Provider is slow to respond
- Network connectivity issues
- Firewall blocking requests

**Error**: `"Network error - Cannot resolve hostname"`

**Causes**:
- Custom endpoint URL has wrong domain
- DNS resolution failed
- Provider domain doesn't exist

**Error**: `"Network error - Connection refused"`

**Causes**:
- Custom endpoint port is wrong
- Service is not running
- Firewall blocking connection

**Error**: `"Network error - Connection reset by provider"`

**Causes**:
- Provider rejected connection
- SSL/TLS handshake failed
- Provider blocked the request

**Error**: `"Network error - Failed to connect to provider"`

**Causes**:
- Generic network failure
- Internet connectivity issues
- Provider infrastructure problems

**Error**: `"SSL certificate error"`

**Causes**:
- Custom endpoint has invalid certificate
- Certificate expired
- Self-signed certificate rejected

**Admin Action**:
- Verify custom endpoint URL
- Test endpoint in browser
- Check network connectivity
- Use default endpoint instead
- Contact provider support

#### 8. Unexpected Errors

**Error**: `"Unexpected error: [error message]"`

**Causes**:
- Unknown error condition
- Edge function bug
- Provider returned unexpected format

**Admin Action**:
- Check error message for clues
- Contact Doooda support with error details
- Try default provider settings

### Error Response Format

**Database Storage**:

Success:
```sql
last_test_result = 'success'
```

Failure:
```sql
last_test_result = 'failed: Unauthorized - Invalid or missing API key'
```

**UI Display**:

The UI shows the exact error message returned by the test function. No generic "test failed" messages. Admin sees actionable, specific error details.

## Provider-Specific Testing

### OpenAI

**Endpoint**: `https://api.openai.com/v1/chat/completions` (default)

**Authentication**: Bearer token in Authorization header

**Test Request**:
```json
{
  "model": "gpt-4o",
  "messages": [
    { "role": "system", "content": "You are a test assistant." },
    { "role": "user", "content": "Reply with the single word OK" }
  ],
  "max_tokens": 2000,
  "temperature": 0.7
}
```

**Common Errors**:
- 401: Invalid API key
- 403: Insufficient quota
- 404: Model not found
- 429: Rate limit exceeded

### DeepSeek

**Endpoint**: `https://api.deepseek.com/v1/chat/completions` (default)

**Authentication**: Bearer token in Authorization header

**Test Request**: Same format as OpenAI (OpenAI-compatible API)

**Common Errors**:
- 401: Invalid API key
- 429: Rate limit exceeded
- 500: Service temporarily unavailable

### Google Gemini

**Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/[model]:generateContent?key=[API_KEY]` (default)

**Authentication**: API key in query parameter

**Test Request**:
```json
{
  "contents": [
    { "role": "user", "parts": [{ "text": "You are a test assistant." }] },
    { "role": "model", "parts": [{ "text": "Understood." }] },
    { "role": "user", "parts": [{ "text": "Reply with the single word OK" }] }
  ],
  "generationConfig": {
    "maxOutputTokens": 2000,
    "temperature": 0.7
  }
}
```

**Common Errors**:
- 400: Invalid API key format
- 403: Billing not enabled, insufficient quota
- 404: Model not found
- 429: Rate limit exceeded

### Anthropic Claude

**Endpoint**: `https://api.anthropic.com/v1/messages` (default)

**Authentication**: x-api-key header

**Test Request**:
```json
{
  "model": "claude-sonnet-4-20250514",
  "system": "You are a test assistant.",
  "messages": [
    { "role": "user", "content": "Reply with the single word OK" }
  ],
  "max_tokens": 2000,
  "temperature": 0.7
}
```

**Common Errors**:
- 401: Invalid API key
- 403: Insufficient credits
- 404: Model not found
- 429: Rate limit exceeded

## UI Integration

### Test Button

**Location**: Admin Dashboard → Ask Doooda → AI Providers → Each provider row

**Label**: "Test" (when idle), "Testing..." (during test)

**Behavior**:
1. Admin clicks "Test" button
2. Button shows "Testing..." and is disabled
3. Frontend calls edge function with provider_id
4. Edge function makes real API request
5. Result stored in database
6. Provider list reloads to show updated status
7. Button returns to "Test" state

**Visual Feedback**:

Success:
- Last test result shows "success" in green

Failure:
- Last test result shows error message in red
- Error is specific and actionable

Never tested:
- Last test result shows "Never tested" in gray

### Last Test Display

**Format**:
```
Last Test: success (timestamp)
Last Test: failed: Invalid API key (timestamp)
Last Test: Never tested
```

**Color Coding**:
- Green: success
- Red: failed
- Gray: never tested

### Error Display Behavior

Errors are shown in two places:

1. **Provider row**: `last_test_result` column
2. **Global error**: Top of page if request fails completely

Global errors only show for:
- Network failure to edge function
- Edge function crashed
- Authentication failed

Provider-specific errors are stored in `last_test_result` and show in the provider row.

## Audit Logging

Every test is logged to `audit_logs`:

```typescript
{
  admin_id: "uuid",
  action: "ai_provider_tested",
  resource_type: "ai_providers",
  resource_id: "provider_uuid",
  metadata: {
    provider_name: "openai",
    result: "success" | "failed: [error message]"
  },
  created_at: "timestamp"
}
```

Admin actions are fully auditable for security and compliance.

## Security Considerations

### API Key Protection

**Never Exposed**:
- API keys are NEVER sent to frontend
- Frontend only sees masked keys: `****sk-xyz`
- Edge function uses service role to read keys
- Keys are only used server-side for API calls

**No Logging**:
- API keys are not logged
- Error messages don't include keys
- Audit logs don't include sensitive data

**Storage**:
- Keys stored in `api_key_encrypted` column
- Field name indicates encryption expectation
- Actual encryption depends on database security

### Request Isolation

**No Leakage**:
- Test requests use minimal, fixed prompts
- No user data or content included
- No prompt/response stored after test
- Test doesn't affect user quotas or limits

**No Side Effects**:
- Test doesn't trigger analytics
- Test doesn't affect Ask Doooda state
- Test doesn't consume user limits
- Test is completely isolated from features

## Testing the Test Function

### Manual Test Procedure

1. **Navigate to Admin**:
   - Login as admin
   - Go to Admin Dashboard
   - Select "Ask Doooda" tab
   - Select "AI Providers" section

2. **Add Test Provider**:
   - Click "Add Provider"
   - Select "OpenAI"
   - Enter valid API key
   - Enter model: "gpt-4o-mini"
   - Save

3. **Test Valid Configuration**:
   - Click "Test" on newly added provider
   - Wait for response
   - Verify "success" appears in Last Test column
   - Verify timestamp is current

4. **Test Invalid Key**:
   - Click "Edit" on provider
   - Change API key to "sk-invalid"
   - Save
   - Click "Test"
   - Verify error shows: "Unauthorized - Invalid or missing API key"

5. **Test Invalid Model**:
   - Edit provider
   - Change model to "gpt-nonexistent"
   - Save
   - Click "Test"
   - Verify error shows: "Invalid model - Model name not found or not available"

6. **Test Invalid Endpoint**:
   - Edit provider
   - Add custom base URL: "https://invalid.example.com/v1/chat"
   - Save
   - Click "Test"
   - Verify error shows network error message

7. **Verify Audit Logs**:
   - Check `audit_logs` table
   - Verify each test created audit entry
   - Verify action = "ai_provider_tested"
   - Verify metadata includes result

### Expected Results

| Scenario | Expected Result |
|----------|----------------|
| Valid OpenAI key | "success" |
| Invalid key | "Unauthorized - Invalid or missing API key" |
| No billing enabled | "Forbidden - Insufficient quota or billing not enabled" |
| Wrong model | "Invalid model - Model name not found or not available" |
| Wrong endpoint | "Network error - Cannot resolve hostname" or similar |
| Slow response | "Connection timed out after 30 seconds" (after 30s) |
| Provider outage | "Provider server error - Service temporarily unavailable" |

## Production Readiness

### When to Test

**Always test**:
- After adding new provider
- After updating API key
- After changing model
- After modifying endpoint
- Before activating provider
- Periodically to verify continued access

**Do NOT test**:
- During active user sessions (tests are isolated, but best practice)
- More than once per minute (respect provider rate limits)
- With production traffic (tests are lightweight, but unnecessary)

### Test Success Criteria

A provider is ready for production when:

1. Test returns "success"
2. Response time is under 10 seconds
3. No authentication errors
4. No permission errors
5. No model access errors
6. Provider is enabled (`is_enabled = true`)

Only activate providers that pass these criteria.

### Troubleshooting Guide

#### Test Never Completes

**Symptoms**: Button shows "Testing..." indefinitely

**Causes**:
- Network timeout (30s limit)
- Edge function crashed
- Provider extremely slow

**Solutions**:
- Wait full 30 seconds
- Refresh page to reset UI state
- Check provider status page
- Try different provider

#### Test Shows Generic Error

**Symptoms**: Error is "Unexpected error: [message]"

**Causes**:
- Unknown error condition
- Provider returned unexpected format
- Edge function bug

**Solutions**:
- Note exact error message
- Check provider documentation
- Try default settings
- Contact support

#### Test Succeeds but Provider Doesn't Work

**Symptoms**: Test shows "success" but Ask Doooda fails

**Causes**:
- Provider has different limits for test vs production
- Provider requires additional configuration
- Different error in production context

**Solutions**:
- Verify provider is set as active
- Check Ask Doooda error messages
- Verify provider is enabled
- Test with minimal Ask Doooda request

## Limitations

### What Tests DON'T Validate

Tests validate basic connectivity and authentication but DO NOT validate:

1. **Cost**: Tests don't estimate API costs or track spending
2. **Performance**: Tests use minimal request, not realistic workload
3. **Quota**: Tests don't check remaining quota/credits
4. **Rate Limits**: Tests don't validate sustained throughput
5. **Model Quality**: Tests don't evaluate output quality
6. **Feature Support**: Tests don't validate all model features
7. **Regional Availability**: Tests may succeed from server but fail from client location

### Test Limitations

- **One Request**: Test makes single request, not comprehensive
- **Fixed Prompt**: Always uses same prompt, doesn't test variations
- **No Streaming**: Tests only validate completion, not streaming
- **No Long Context**: Test uses minimal tokens, not long contexts
- **No Special Features**: Doesn't test function calling, vision, etc.

Tests validate configuration correctness only. Full validation requires production usage.

## Future Enhancements

### Potential Additions (Not Implemented)

1. **Comprehensive Testing**:
   - Test streaming responses
   - Test long context handling
   - Test special features (function calling, vision)
   - Test various prompt types

2. **Performance Testing**:
   - Measure response time
   - Calculate tokens per second
   - Compare providers

3. **Cost Estimation**:
   - Estimate cost per request
   - Track test costs
   - Compare provider pricing

4. **Quota Checking**:
   - Query provider for remaining quota
   - Warn when quota is low
   - Automatic provider switching

5. **Automatic Testing**:
   - Periodic background tests
   - Health monitoring
   - Automatic disable on repeated failures

6. **Advanced Diagnostics**:
   - Detailed latency breakdown
   - Network trace
   - Request/response logging (in test mode)

These are NOT part of the current implementation.

## Summary

The AI Provider Connection Testing system provides:

✅ **Real Validation**: Actual API calls to providers, no mocking
✅ **Comprehensive Error Handling**: Specific, actionable error messages for all failure modes
✅ **Security**: API keys never exposed, admin-only access, full audit logging
✅ **Reliability**: 30-second timeouts, network error detection, graceful degradation
✅ **Isolation**: No impact on Ask Doooda, user limits, or analytics
✅ **Transparency**: Clear success/failure indication, last test timestamp
✅ **Production Ready**: Validates configuration correctness before activation

Tests ensure provider infrastructure is properly configured and ready for production use without any coupling to Ask Doooda or other features.
