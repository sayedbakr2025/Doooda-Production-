# Runtime Enforcement Tests

This document provides test cases to verify that the Runtime Enforcement Layer is working correctly.

## Prerequisites

1. Admin access to the Admin Dashboard
2. A test user account
3. Access to Supabase dashboard (for direct database verification)

---

## Test Suite 1: Global Feature Toggle

### Test 1.1: Disable Ask Doooda Globally

**Objective**: Verify that disabling Ask Doooda globally prevents all users from making requests.

**Steps**:
1. Log in as admin
2. Go to Admin Dashboard → Ask Doooda → Global Settings
3. Toggle "Enable Ask Doooda" OFF
4. Log in as a regular user (in a different browser/incognito)
5. Open any writing page
6. Verify floating button is still visible (visibility != enforcement)
7. Click floating button to open chat
8. Type a message and send
9. Observe response

**Expected Result**:
- Chat panel opens (visible)
- User's message appears
- doooda responds with fallback message (in-character, no system error)
- Message is something like: "Let's take a short pause and continue in a moment."
- No actual AI call is made
- Usage is NOT recorded as success

**Database Check**:
```sql
SELECT * FROM doooda_config;
-- is_enabled should be false

SELECT * FROM ai_usage_tracking
WHERE user_id = 'test-user-id'
ORDER BY request_timestamp DESC LIMIT 1;
-- response_status should be 'error' or no new row
```

### Test 1.2: Re-enable Ask Doooda

**Objective**: Verify that enabling Ask Doooda immediately allows requests.

**Steps**:
1. As admin, toggle "Enable Ask Doooda" back ON
2. As test user (do NOT refresh page), send another message
3. Observe response

**Expected Result**:
- doooda responds normally with AI-generated answer
- Response is relevant to the question
- Usage IS recorded as success

**Database Check**:
```sql
SELECT * FROM ai_usage_tracking
WHERE user_id = 'test-user-id'
ORDER BY request_timestamp DESC LIMIT 1;
-- response_status should be 'success'
```

---

## Test Suite 2: Plan-Based Limits

### Test 2.1: FREE Plan Limit Enforcement

**Objective**: Verify that FREE plan users hit their daily limit correctly.

**Steps**:
1. Ensure test user is on FREE plan
2. Check current limits:
```sql
SELECT * FROM ai_usage_limits
WHERE limit_type = 'plan_based' AND plan_name = 'FREE';
-- Should show daily_limit = 3, monthly_limit = 30
```
3. As test user, send 3 requests to Ask Doooda (should all succeed)
4. Send 4th request
5. Observe response

**Expected Result**:
- First 3 requests succeed with AI responses
- 4th request shows user's message in chat
- doooda responds in-character: "Looks like we've done a lot together today. Let's continue soon."
- Upgrade hint is shown
- Input is NOT disabled (user can try again tomorrow)

**Database Check**:
```sql
SELECT COUNT(*) FROM ai_usage_tracking
WHERE user_id = 'test-user-id'
  AND request_timestamp >= date_trunc('day', now() AT TIME ZONE 'UTC')
  AND response_status = 'success';
-- Should be 3
```

### Test 2.2: Plan Upgrade Immediate Effect

**Objective**: Verify that upgrading a user's plan immediately grants higher limits.

**Steps**:
1. Test user has hit FREE daily limit (3/3)
2. As admin, upgrade user to PRO plan:
```sql
UPDATE users SET plan = 'PRO', plan_start_date = now(), plan_end_date = now() + interval '1 year'
WHERE id = 'test-user-id';
```
3. As test user (do NOT refresh page), send another request
4. Observe response

**Expected Result**:
- Request succeeds with AI response
- User is NOT blocked
- PRO limits now apply (50/day, 500/month)

**Database Check**:
```sql
SELECT get_user_plan('test-user-id');
-- Should return 'PRO'

SELECT COUNT(*) FROM ai_usage_tracking
WHERE user_id = 'test-user-id'
  AND request_timestamp >= date_trunc('day', now() AT TIME ZONE 'UTC')
  AND response_status = 'success';
-- Should be 4 (3 from FREE + 1 from PRO)
```

---

## Test Suite 3: User Overrides

### Test 3.1: Grant Unlimited Access

**Objective**: Verify that user-specific overrides take precedence over plan limits.

**Steps**:
1. Test user is on FREE plan (3/day limit)
2. User has used 3 requests today
3. As admin, grant unlimited access:
```sql
INSERT INTO ai_usage_limits (limit_type, user_id, is_unlimited, is_active)
VALUES ('user_override', 'test-user-id', true, true);
```
4. As test user, send multiple requests (4th, 5th, 6th...)
5. Observe responses

**Expected Result**:
- All requests succeed
- No limit messages shown
- User can make unlimited requests

**Database Check**:
```sql
SELECT * FROM ai_usage_limits
WHERE limit_type = 'user_override' AND user_id = 'test-user-id';
-- Should show is_unlimited = true

SELECT COUNT(*) FROM ai_usage_tracking
WHERE user_id = 'test-user-id'
  AND request_timestamp >= date_trunc('day', now() AT TIME ZONE 'UTC')
  AND response_status = 'success';
-- Should be > 3
```

### Test 3.2: Custom Limit Override

**Objective**: Verify that custom daily limits work correctly.

**Steps**:
1. Remove unlimited override:
```sql
DELETE FROM ai_usage_limits
WHERE limit_type = 'user_override' AND user_id = 'test-user-id';
```
2. Grant custom limit of 10/day:
```sql
INSERT INTO ai_usage_limits (limit_type, user_id, daily_limit, is_active)
VALUES ('user_override', 'test-user-id', 10, true);
```
3. As test user, send requests until limit is hit
4. Observe when limit message appears

**Expected Result**:
- User can make 10 requests per day
- 11th request shows limit message
- Limit is custom override, not plan-based

---

## Test Suite 4: AI Provider Runtime Selection

### Test 4.1: Switch Active Provider

**Objective**: Verify that changing active provider immediately affects next request.

**Steps**:
1. Note current active provider:
```sql
SELECT active_provider_id FROM doooda_config;
```
2. As admin, go to Admin Dashboard → Ask Doooda → AI Providers
3. Select a different provider and click "Set as Active"
4. As test user, send a request
5. Check which provider was used:
```sql
SELECT provider_used FROM ai_usage_tracking
WHERE user_id = 'test-user-id'
ORDER BY request_timestamp DESC LIMIT 1;
```

**Expected Result**:
- Request succeeds
- New provider is used
- Response quality may differ slightly
- No error or downtime

### Test 4.2: No Provider Available

**Objective**: Verify graceful handling when no provider is available.

**Steps**:
1. As admin, disable all AI providers:
```sql
UPDATE ai_providers SET is_enabled = false;
```
2. As test user, send a request
3. Observe response

**Expected Result**:
- User's message appears in chat
- doooda responds with fallback (not an error message)
- No crash or system error shown
- Usage recorded as error

**Cleanup**:
```sql
UPDATE ai_providers SET is_enabled = true WHERE provider_name = 'openai';
```

---

## Test Suite 5: Persona Runtime Updates

### Test 5.1: Update Persona

**Objective**: Verify that persona changes apply to next request.

**Steps**:
1. Note current active persona:
```sql
SELECT version_number, persona_prompt_en FROM doooda_persona_versions WHERE is_active = true;
```
2. Create and activate new persona version:
```sql
UPDATE doooda_persona_versions SET is_active = false;
INSERT INTO doooda_persona_versions (version_number, persona_prompt_en, persona_prompt_ar, guardrails_en, guardrails_ar, is_active)
VALUES (2, 'Updated persona with different tone', 'نسخة محدثة بنبرة مختلفة', 'Updated guardrails', 'قواعد محدثة', true);
```
3. As test user, send a request asking: "Who are you?"
4. Observe tone and personality in response

**Expected Result**:
- Response reflects new persona
- Tone matches updated instructions
- Change is immediate (no restart needed)

---

## Test Suite 6: Frontend Cannot Bypass

### Test 6.1: Manipulate Frontend State

**Objective**: Verify that client-side state manipulation cannot bypass server enforcement.

**Steps**:
1. Test user has hit daily limit (3/3)
2. Open browser DevTools → Console
3. Try to manipulate access state:
```javascript
// Try to force allowed state
const event = new CustomEvent('openDoooda', { detail: { source: 'floating-button' }});
document.dispatchEvent(event);
// Chat opens (that's fine)

// Type a message and send
// The request will go to edge function
```
4. Observe response

**Expected Result**:
- Chat opens (frontend visibility is allowed)
- Message can be typed
- But server still enforces limit
- User sees limit message from doooda
- Request does NOT bypass enforcement

**Security Guarantee**: Frontend state is for UX only. Server always validates.

---

## Test Suite 7: Usage Tracking Accuracy

### Test 7.1: Verify Usage Counts

**Objective**: Ensure usage tracking is accurate and cannot be manipulated.

**Steps**:
1. Clear test user's usage for today:
```sql
DELETE FROM ai_usage_tracking
WHERE user_id = 'test-user-id'
  AND request_timestamp >= date_trunc('day', now() AT TIME ZONE 'UTC');
```
2. As test user, make exactly 5 requests
3. Check usage via frontend (if displayed)
4. Check usage in database:
```sql
SELECT COUNT(*) FROM ai_usage_tracking
WHERE user_id = 'test-user-id'
  AND request_timestamp >= date_trunc('day', now() AT TIME ZONE 'UTC')
  AND response_status = 'success';
```

**Expected Result**:
- Database shows exactly 5 successful requests
- Frontend displays accurate count (if shown)
- Failed requests are NOT counted toward limit
- Only successful AI responses count

---

## Test Suite 8: Edge Cases

### Test 8.1: Midnight Rollover

**Objective**: Verify that daily limits reset at midnight UTC.

**Steps**:
1. Test user has used 3/3 requests (FREE plan)
2. Wait until midnight UTC (or manually adjust system time for testing)
3. Send request
4. Observe response

**Expected Result**:
- Request succeeds
- Daily limit has reset
- User can make 3 more requests

### Test 8.2: Concurrent Requests

**Objective**: Verify that concurrent requests don't allow bypassing limits.

**Steps**:
1. Test user has 1 request remaining (2/3 used)
2. Send 3 requests simultaneously (e.g., open 3 tabs, send at same time)
3. Observe responses

**Expected Result**:
- Exactly 1 request succeeds
- Other 2 requests get limit message
- Race condition handled correctly
- Usage count is accurate (3 total)

---

## Automated Test Script

You can use this SQL script to quickly verify runtime enforcement:

```sql
-- Test runtime enforcement
DO $$
DECLARE
  v_access jsonb;
  v_state jsonb;
BEGIN
  -- Test 1: Check doooda access
  SELECT check_doooda_access() INTO v_access;
  RAISE NOTICE 'Access check: %', v_access;

  -- Test 2: Resolve user state
  SELECT resolve_user_state() INTO v_state;
  RAISE NOTICE 'User state: %', v_state;

  -- Test 3: Check feature access
  SELECT can_access_feature('doooda') INTO v_access;
  RAISE NOTICE 'Feature access: %', v_access;

  -- Test 4: Get feature config
  SELECT get_admin_feature_config('doooda') INTO v_access;
  RAISE NOTICE 'Feature config: %', v_access;
END $$;
```

---

## Success Criteria

The Runtime Enforcement Layer is working correctly if:

✅ All admin changes apply to the next request (no restart needed)
✅ User overrides take precedence over plan limits
✅ Plan limits are enforced accurately
✅ Global disable blocks all users immediately
✅ Provider switching works seamlessly
✅ Persona updates apply immediately
✅ Frontend cannot bypass server enforcement
✅ Usage tracking is accurate
✅ Limit messages are in-character (never system errors)
✅ All failures are graceful (no crashes)

---

## Troubleshooting

### Issue: Admin changes not applying

**Check**:
1. Is the change saved in the database?
```sql
SELECT * FROM doooda_config;
```
2. Is the edge function calling the right RPC?
```sql
-- Check edge function logs in Supabase dashboard
```
3. Is there client-side caching interfering?
```javascript
// Frontend should NOT cache access state for enforcement
```

### Issue: Limits not enforced

**Check**:
1. Is the limit configured correctly?
```sql
SELECT * FROM ai_usage_limits WHERE plan_name = 'FREE';
```
2. Is usage being recorded?
```sql
SELECT * FROM ai_usage_tracking WHERE user_id = 'test-user-id' ORDER BY request_timestamp DESC;
```
3. Is check_doooda_access() being called?
```typescript
// Edge function must call this on EVERY request
const { data: accessData } = await anonClient.rpc("check_doooda_access");
```

### Issue: Wrong provider being used

**Check**:
1. Active provider ID in config:
```sql
SELECT active_provider_id FROM doooda_config;
```
2. Provider is enabled:
```sql
SELECT * FROM ai_providers WHERE id = 'active-provider-id';
```
3. Edge function loads provider at runtime (not cached)
