# Runtime Enforcement Architecture

## Overview

Doooda implements a **Runtime Enforcement Layer** that ensures all feature access decisions are made at runtime based on admin-configured database state. This architecture guarantees that admin changes apply immediately without requiring code deployments, restarts, or cache invalidation.

## Core Principles

### 1. Single Source of Truth

**The database is the only authority for feature access decisions.**

- UI does NOT decide permissions
- Frontend does NOT cache access state for enforcement
- Backend does NOT use hardcoded rules
- All decisions come from database functions at runtime

### 2. Zero-Trust Runtime Resolution

**Every protected action resolves fresh state from the database.**

On each request:
1. Authenticate user
2. Load active plan and dates
3. Load feature flags and config
4. Load usage limits (with user overrides)
5. Check usage against limits
6. Make allow/deny decision
7. Record usage if allowed

### 3. Admin Config Drives Behavior

**All admin changes affect runtime behavior immediately.**

When an admin:
- Enables/disables Ask Doooda globally → Next request respects it
- Changes active AI provider → Next request uses new provider
- Updates plan limits → Next request enforces new limits
- Adds user override → Next request applies override
- Changes persona → Next request uses new persona

No restart. No redeploy. No cache clear.

---

## Runtime Enforcement Flow

### Ask Doooda Request Flow

```
1. User triggers Ask Doooda
   ↓
2. Frontend sends request to /ask-doooda edge function
   ↓
3. Edge function authenticates user
   ↓
4. Edge function calls check_doooda_access()
   ├─ Verify authentication
   ├─ Check global enable/disable
   ├─ Check active provider exists
   ├─ Get user plan
   ├─ Load limits (user override > plan > global default)
   └─ Check usage against limits
   ↓
5. If blocked → Return in-character response explaining limit
   ↓
6. If allowed → Continue
   ↓
7. Load admin config (doooda_config table)
   ├─ Active provider ID
   ├─ Session memory enabled
   ├─ Max context length
   └─ Disabled messages
   ↓
8. Select AI provider (runtime)
   ├─ Prefer active_provider_id
   ├─ Fallback to default provider
   └─ Fallback to any enabled provider
   ↓
9. Load plan-based model override (if any)
   ↓
10. Load active persona from doooda_persona_versions
    ├─ persona_prompt (en/ar)
    ├─ guardrails (en/ar)
    └─ Apply writing mode modifier
   ↓
11. Call AI provider with assembled system prompt
    ↓
12. Sanitize response (remove AI leaks)
    ↓
13. Record usage in ai_usage_tracking
    ↓
14. Return response as doooda
```

### Key Runtime Functions

#### `check_doooda_access()`

**Purpose**: Single source of truth for Ask Doooda access decisions.

**Checks** (in order):
1. Authentication (auth.uid())
2. Global enable/disable (doooda_config.is_enabled)
3. Active provider exists (ai_providers with valid API key)
4. User plan (get_user_plan())
5. Limits with override hierarchy:
   - User-specific override (ai_usage_limits, limit_type='user_override')
   - Plan-based limits (ai_usage_limits, limit_type='plan_based')
   - Global defaults (ai_usage_limits, limit_type='global_default')
6. Current usage (ai_usage_tracking)

**Returns**: `{ allowed: boolean, reason?: string, plan?: string, limits... }`

**Security**: SECURITY DEFINER (bypasses RLS), uses auth.uid() for safety.

#### `resolve_user_state()`

**Purpose**: Comprehensive user state resolution with all overrides.

**Returns**:
```json
{
  "authenticated": true,
  "user_id": "uuid",
  "email": "user@example.com",
  "is_active": true,
  "plan": "PRO",
  "plan_start": "2024-01-01T00:00:00Z",
  "plan_end": "2025-01-01T00:00:00Z",
  "daily_limit": 50,
  "monthly_limit": 1000,
  "is_unlimited": false,
  "model_override": "gpt-4",
  "has_user_override": false
}
```

**Use Cases**:
- Feature access checks
- Usage tracking
- Admin dashboards
- Analytics

#### `can_access_feature(feature_name)`

**Purpose**: Generic feature access check for future features.

**Current Features**:
- `'doooda'` → Delegates to check_doooda_access()

**Extensible**: Add new features by adding cases to this function.

#### `get_admin_feature_config(feature_name)`

**Purpose**: Load admin-configured feature settings at runtime.

**Returns**: Feature-specific config from admin tables.

---

## Admin → Runtime Binding

### How Admin Changes Apply Immediately

#### 1. Global Enable/Disable

**Admin Action**: Toggle "Enable Ask Doooda" in Admin Panel

**Database**: `UPDATE doooda_config SET is_enabled = false`

**Runtime Effect**: Next `check_doooda_access()` call returns `{ allowed: false, reason: 'globally_disabled' }`

**User Experience**: User sees in-character message explaining temporary unavailability.

#### 2. Active AI Provider

**Admin Action**: Select active provider in Admin Panel

**Database**: `UPDATE doooda_config SET active_provider_id = 'uuid'`

**Runtime Effect**: Next request to `/ask-doooda` loads the new provider and uses its API key, endpoint, and model.

**User Experience**: Seamless. User sees no difference except potentially improved responses.

#### 3. Plan Limits

**Admin Action**: Update plan limits in Admin Panel

**Database**: `UPDATE ai_usage_limits SET daily_limit = 100 WHERE plan_name = 'PRO'`

**Runtime Effect**: Next `check_doooda_access()` call for PRO users enforces new limit.

**User Experience**: PRO users immediately get 100 requests/day.

#### 4. User Override

**Admin Action**: Grant user-specific override in Admin Panel

**Database**: `INSERT INTO ai_usage_limits (limit_type, user_id, daily_limit, is_unlimited) VALUES ('user_override', 'uuid', NULL, true)`

**Runtime Effect**: Next `check_doooda_access()` call for this user returns unlimited access.

**User Experience**: User immediately gets unlimited requests.

#### 5. Persona Changes

**Admin Action**: Update persona or activate new version

**Database**:
```sql
UPDATE doooda_persona_versions SET is_active = false WHERE is_active = true;
UPDATE doooda_persona_versions SET is_active = true WHERE version_number = 2;
```

**Runtime Effect**: Next request to `/ask-doooda` loads the new persona prompts and guardrails.

**User Experience**: doooda speaks with updated personality/instructions.

---

## Frontend vs. Backend Responsibilities

### Frontend Responsibilities

**Display Only**:
- Show/hide UI elements based on `visible` state
- Display usage stats (daily/monthly used/limit)
- Show in-character limit messages
- Provide upgrade prompts

**NOT Responsible For**:
- Enforcing limits (server enforces)
- Caching access decisions for enforcement (only for UX)
- Deciding who can access features

### Backend Responsibilities

**Enforcement**:
- All access decisions
- All limit checks
- All usage tracking
- All admin config resolution

**The backend never trusts the frontend.**

---

## Security Guarantees

### 1. No Client-Side Bypass

**Frontend cannot bypass limits** because:
- All enforcement happens server-side
- Edge functions validate access on every request
- Database functions use SECURITY DEFINER with auth.uid()
- RLS protects all user data

### 2. Admin Control is Absolute

**Admins have complete runtime control** because:
- All decisions come from database
- No hardcoded rules in code
- No cached state that bypasses DB
- Changes apply to next request

### 3. User Data is Protected

**User data is never exposed** because:
- RLS enforces row-level access
- Edge functions use service role only for config tables
- User requests use authenticated client (anon key + auth header)
- SECURITY DEFINER functions use auth.uid() to ensure safety

---

## Testing Runtime Enforcement

### Test Case 1: Global Disable

**Steps**:
1. Admin disables Ask Doooda globally
2. User opens chat panel (still visible)
3. User sends message
4. Edge function calls `check_doooda_access()` → returns `{ allowed: false, reason: 'globally_disabled' }`
5. Edge function returns in-character fallback
6. User sees: "Let's take a short pause and continue in a moment."

**Expected**: No AI call made. No error shown. In-character response.

### Test Case 2: Plan Upgrade

**Steps**:
1. User has FREE plan (3 requests/day)
2. Admin upgrades user to PRO plan
3. User refreshes page
4. User sends 4th request (would exceed FREE limit)
5. Edge function calls `check_doooda_access()` → loads PRO limits → returns `{ allowed: true, daily_limit: 50 }`
6. Request succeeds

**Expected**: Upgrade applies immediately. No restart needed.

### Test Case 3: User Override

**Steps**:
1. User has PRO plan (50 requests/day)
2. User hits 50 requests
3. Admin grants unlimited override for this user
4. User sends 51st request
5. Edge function calls `check_doooda_access()` → finds user override → returns `{ allowed: true, unlimited: true }`
6. Request succeeds

**Expected**: Override applies immediately to next request.

### Test Case 4: Provider Switch

**Steps**:
1. Active provider is OpenAI
2. Admin switches to DeepSeek
3. User sends request
4. Edge function loads config → active_provider_id points to DeepSeek
5. Edge function calls `callDeepSeek()` with DeepSeek API key
6. Response returned

**Expected**: Provider switch happens on next request. No code deploy.

---

## Extending Runtime Enforcement

### Adding a New Feature

**Example**: Add "Smart Suggestions" feature

**Step 1**: Add feature config table
```sql
CREATE TABLE smart_suggestions_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean DEFAULT true,
  suggestion_frequency text DEFAULT 'medium',
  updated_at timestamptz DEFAULT now()
);
```

**Step 2**: Add to runtime resolution
```sql
ALTER FUNCTION can_access_feature(text) ...
  IF p_feature_name = 'smart_suggestions' THEN
    SELECT is_enabled INTO v_enabled FROM smart_suggestions_config LIMIT 1;
    RETURN jsonb_build_object('allowed', v_enabled);
  END IF;
...
```

**Step 3**: Create edge function
```typescript
// supabase/functions/smart-suggestions/index.ts
const { data: access } = await anonClient.rpc('can_access_feature', { p_feature_name: 'smart_suggestions' });
if (!access?.allowed) {
  return new Response(JSON.stringify({ error: 'Feature disabled' }), { status: 403 });
}
// ... rest of logic
```

**Step 4**: Add admin UI to configure it

**Done**. No application code changes needed for enforcement logic.

---

## Summary

**Admin config defines reality.**
**Runtime enforces it.**
**UI only reflects it.**

This architecture ensures:
- Admins have complete control
- Changes apply immediately
- No hardcoded rules
- No client-side bypass
- Single source of truth
- Future-proof extensibility
