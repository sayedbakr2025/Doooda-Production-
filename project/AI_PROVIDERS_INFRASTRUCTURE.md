# AI Providers Infrastructure Layer

## Overview

The AI Providers infrastructure is a centralized system for managing AI provider configurations. It provides a single source of truth for provider credentials, endpoints, and settings across all AI-powered features in Doooda.

**Status**: Infrastructure complete and functional. Ready for integration with AI features.

## Architecture

### Single Source of Truth

All AI provider configuration is stored in the `ai_providers` table. Features that need AI access query this table to:
1. Discover which provider is active
2. Retrieve API credentials (securely)
3. Get model and endpoint configuration

### Database Schema

```sql
CREATE TABLE ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL,              -- 'openai', 'gemini', 'deepseek', 'anthropic'
  api_key_encrypted text NOT NULL,          -- API key (stored as-is, never exposed to frontend)
  api_endpoint text,                        -- Custom endpoint URL (optional)
  model_name text NOT NULL,                 -- Model identifier
  max_tokens integer DEFAULT 2000,          -- Token limit for requests
  temperature decimal(3,2) DEFAULT 0.7,     -- Model temperature
  is_enabled boolean DEFAULT false,         -- Can this provider be used?
  is_active boolean DEFAULT false,          -- Is this the active provider?
  is_default boolean DEFAULT false,         -- Fallback provider
  daily_request_limit integer,              -- Optional rate limit
  provider_config jsonb,                    -- Provider-specific config
  last_test_at timestamp with time zone,    -- Last test timestamp
  last_test_result text,                    -- Test result status
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### Core Constraints

#### 1. Only One Active Provider

**Constraint**: `idx_ai_one_active`
- Ensures only one provider can have `is_active = true` at any time
- Implemented as a unique partial index: `CREATE UNIQUE INDEX idx_ai_one_active ON ai_providers(is_active) WHERE is_active = true`

#### 2. Automatic Deactivation Trigger

**Function**: `ensure_single_active_provider()`

When a provider is activated:
1. Trigger executes before INSERT/UPDATE
2. Sets all other providers to `is_active = false`
3. Only the newly activated provider has `is_active = true`

```sql
CREATE TRIGGER trigger_ensure_single_active_provider
  BEFORE INSERT OR UPDATE OF is_active ON ai_providers
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_provider();
```

This guarantees atomicity and consistency at the database level.

#### 3. Only One Default Fallback

**Constraint**: `idx_ai_one_default`
- Ensures only one provider can have `is_default = true`
- Implemented as: `CREATE UNIQUE INDEX idx_ai_one_default ON ai_providers(is_default) WHERE is_default = true`

## Admin UI

### Location

**Admin Dashboard → Ask Doooda → AI Providers**

Component: `src/components/admin/doooda/DooodaProviders.tsx`

### Features

#### 1. View All Providers

Displays:
- Provider name and type (OpenAI, Gemini, DeepSeek, Anthropic)
- Active status (highlighted with blue border)
- Enabled/Disabled status
- Model name
- Masked API key (shows last 4 characters)
- Daily request limit
- Last test result (success/failure)
- Custom endpoint (if configured)

#### 2. Add New Provider

**Flow**:
1. Click "Add Provider"
2. Select provider type (OpenAI, Gemini, DeepSeek, Anthropic)
3. Form dynamically adjusts based on provider type
4. Required fields:
   - API Key (password field, never shown after save)
   - Model name (pre-filled with default)
5. Optional fields:
   - Base URL (custom endpoint)
   - Provider-specific config (e.g., Gemini project_id)
6. Provider is created with `is_enabled=true` and `is_active=false`

**Supported Providers**:

| Provider | Default Model | Required Fields | Optional Fields |
|----------|---------------|-----------------|-----------------|
| OpenAI | gpt-4o | API Key, Model | Base URL |
| Gemini | gemini-2.0-flash | API Key, Model | Project ID |
| DeepSeek | deepseek-chat | API Key, Model | Base URL |
| Anthropic | claude-sonnet-4-20250514 | API Key, Model | Base URL |

#### 3. Edit Provider

**Editable Fields**:
- API Key (optional - leave empty to keep current)
- Model name
- Base URL / Endpoint
- Max tokens
- Temperature
- Daily request limit
- Enabled/Disabled toggle
- Default fallback toggle
- Provider-specific config

**Security**:
- API key field is password type
- Current key is never displayed
- Only updated if user enters new value

#### 4. Activate/Deactivate Provider

**Activate**:
- Click "Set Active" on any enabled provider
- System automatically deactivates current active provider
- New provider becomes active immediately
- Visual indicator (blue border + "Active" badge) updates

**Deactivate**:
- Click "Deactivate" on the active provider
- Provider status changes to inactive
- No provider is active until another is activated

**Constraint Enforcement**:
- Database trigger ensures only one active provider
- UI reflects database state immediately after update

#### 5. Test Provider

**Purpose**: Validate provider configuration with a real API call

**Process**:
1. Admin clicks "Test" button
2. Frontend calls `test-ai-provider` edge function
3. Edge function makes real API request to provider
4. Result stored in `last_test_at` and `last_test_result`
5. UI displays result (success/failure with error message)

**Test Request**:
```typescript
{
  system: "You are a test assistant.",
  messages: [{ role: "user", content: "Reply with the single word OK" }]
}
```

**Possible Results**:
- "success" - Provider is properly configured
- "failed: Invalid API key" - Authentication error
- "failed: Model or endpoint not found" - Model name incorrect
- "failed: Rate limited by provider" - Too many requests
- "failed: Connection timed out" - Network timeout
- "failed: Network error: <details>" - Other network issues

#### 6. Delete Provider

**Flow**:
1. Click "Delete" button
2. Confirmation prompt appears
3. Click "Confirm Delete" to proceed
4. Provider is permanently removed from database
5. If provider was active, no provider remains active

**Safety**:
- Two-step confirmation required
- Cannot be undone
- Deleting active provider automatically clears active status

### Empty States

#### No Providers Configured
```
┌─────────────────────────────────────┐
│                                     │
│   No AI providers configured.       │
│   Click "Add Provider" to start.    │
│                                     │
└─────────────────────────────────────┘
```

#### No Active Provider
All providers exist but none are active. Admin sees list with "Set Active" buttons.

## Security

### API Key Protection

**Storage**:
- Keys are stored in the database (field: `api_key_encrypted`)
- Field name says "encrypted" for clarity, but actual encryption implementation depends on database security
- Keys are NEVER exposed to frontend

**Frontend**:
- When displaying provider, only last 4 characters shown: `****sk-xyz`
- Edit form has password field for key
- Key field is optional in edit mode (leave empty = keep existing)

**Backend**:
- Edge functions use service role to read keys
- Keys are only used server-side for API calls
- No key logging or exposure

### Admin-Only Access

**Row Level Security**:
```sql
CREATE POLICY "Admins can manage AI providers"
ON ai_providers FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);
```

Only users with `role = 'admin'` can:
- View providers
- Add/edit/delete providers
- Test providers
- Activate/deactivate providers

## Integration Points

### For AI Features (e.g., Ask Doooda)

To integrate with the AI Providers infrastructure:

#### 1. Query Active Provider

```typescript
const { data: activeProvider } = await supabase
  .from('ai_providers')
  .select('*')
  .eq('is_active', true)
  .eq('is_enabled', true)
  .maybeSingle();

if (!activeProvider) {
  // No active provider configured
  return fallbackResponse();
}
```

#### 2. Fallback to Default

```typescript
if (!activeProvider) {
  const { data: defaultProvider } = await supabase
    .from('ai_providers')
    .select('*')
    .eq('is_enabled', true)
    .eq('is_default', true)
    .maybeSingle();

  if (defaultProvider) {
    activeProvider = defaultProvider;
  }
}
```

#### 3. Make AI Request

```typescript
import { callAIProvider } from '../_shared/ai-providers.ts';

const response = await callAIProvider(
  activeProvider,
  systemPrompt,
  messages,
  modelOverride
);
```

The `callAIProvider` function handles:
- Routing to correct provider (OpenAI, Gemini, DeepSeek, Anthropic)
- Request formatting per provider's API
- Error handling and classification
- Response parsing

## Provider Configuration Examples

### OpenAI

```json
{
  "provider_name": "openai",
  "api_key_encrypted": "sk-proj-...",
  "model_name": "gpt-4o",
  "api_endpoint": null,
  "max_tokens": 2000,
  "temperature": 0.7,
  "is_enabled": true,
  "is_active": true,
  "provider_config": {}
}
```

### Gemini

```json
{
  "provider_name": "gemini",
  "api_key_encrypted": "AIza...",
  "model_name": "gemini-2.0-flash",
  "api_endpoint": null,
  "max_tokens": 2000,
  "temperature": 0.7,
  "is_enabled": true,
  "is_active": false,
  "provider_config": {
    "project_id": "my-gcp-project"
  }
}
```

### DeepSeek

```json
{
  "provider_name": "deepseek",
  "api_key_encrypted": "sk-...",
  "model_name": "deepseek-chat",
  "api_endpoint": null,
  "max_tokens": 2000,
  "temperature": 0.7,
  "is_enabled": true,
  "is_active": false,
  "provider_config": {}
}
```

### Custom Endpoint Example

```json
{
  "provider_name": "openai",
  "api_key_encrypted": "sk-...",
  "model_name": "gpt-4o",
  "api_endpoint": "https://my-proxy.example.com/v1/chat/completions",
  "max_tokens": 2000,
  "temperature": 0.7,
  "is_enabled": true,
  "is_active": true,
  "provider_config": {}
}
```

## Error Handling

### Database Errors

**Duplicate Active Provider**:
- Should never occur due to constraint
- If attempted: `duplicate key value violates unique constraint "idx_ai_one_active"`
- UI shows generic error message

**Invalid Provider Name**:
- Constraint: `provider_name IN ('openai', 'gemini', 'copilot', 'deepseek', 'anthropic')`
- UI only shows valid options in dropdown

### API Errors

**No Provider Configured**:
```typescript
if (!activeProvider) {
  return {
    error: "No AI providers configured",
    userMessage: "Please configure an AI provider in Admin settings."
  };
}
```

**No Active Provider**:
```typescript
if (!activeProvider && !defaultProvider) {
  return {
    error: "No active provider",
    userMessage: "Please activate an AI provider in Admin settings."
  };
}
```

**Provider Test Failed**:
- Error details stored in `last_test_result`
- Admin sees specific error (e.g., "Invalid API key")
- Admin can edit configuration and retry

## Audit Logging

All provider operations are logged to `audit_logs`:

```typescript
await supabase.from('audit_logs').insert([{
  admin_id: user.id,
  action: 'ai_provider_tested',
  resource_type: 'ai_providers',
  resource_id: provider.id,
  metadata: {
    provider_name: 'openai',
    result: 'success'
  }
}]);
```

**Logged Actions**:
- `ai_provider_tested` - Provider test executed
- `ai_provider_created` - New provider added
- `ai_provider_updated` - Provider configuration changed
- `ai_provider_deleted` - Provider removed
- `ai_provider_activated` - Provider set as active
- `ai_provider_deactivated` - Provider deactivated

## Data Migration

The migration `049_add_is_active_to_ai_providers.sql` includes a one-time data migration:

1. Adds `is_active` column to existing `ai_providers` table
2. Reads `active_provider_id` from `doooda_config`
3. If a provider was marked active in config, sets `is_active = true` for that provider
4. All other providers get `is_active = false`

This ensures backward compatibility and preserves existing active provider selection.

## Future Enhancements

### Potential Additions (Not Implemented)

1. **Provider-Specific Rate Limiting**
   - Track daily/monthly usage per provider
   - Automatic failover when limit reached

2. **Multiple Active Providers**
   - Load balancing across providers
   - Automatic retry with different provider on failure

3. **Provider Health Monitoring**
   - Automatic periodic testing
   - Alert admin if provider fails
   - Auto-disable failing providers

4. **Cost Tracking**
   - Log tokens used per provider
   - Calculate estimated costs
   - Budget alerts

5. **Provider Priority**
   - Primary, secondary, tertiary providers
   - Automatic failover chain

These are NOT part of the current implementation.

## Testing the Infrastructure

### Manual Test Checklist

1. **Add Provider**:
   - ✓ Go to Admin Dashboard → Ask Doooda → AI Providers
   - ✓ Click "Add Provider"
   - ✓ Select OpenAI
   - ✓ Enter API key
   - ✓ Save
   - ✓ Verify provider appears in list

2. **Test Provider**:
   - ✓ Click "Test" button
   - ✓ Wait for result
   - ✓ Verify "success" or specific error message
   - ✓ Check `last_test_result` in UI

3. **Activate Provider**:
   - ✓ Click "Set Active"
   - ✓ Verify blue border and "Active" badge appear
   - ✓ If another was active, verify it's now inactive

4. **Add Second Provider**:
   - ✓ Add another provider (e.g., Gemini)
   - ✓ Verify first provider still active

5. **Switch Active Provider**:
   - ✓ Click "Set Active" on second provider
   - ✓ Verify first provider loses active status
   - ✓ Verify second provider becomes active

6. **Deactivate**:
   - ✓ Click "Deactivate" on active provider
   - ✓ Verify no provider is active

7. **Edit Provider**:
   - ✓ Click "Edit"
   - ✓ Change model name
   - ✓ Save
   - ✓ Verify changes persist

8. **Delete Provider**:
   - ✓ Click "Delete"
   - ✓ Verify confirmation prompt
   - ✓ Confirm deletion
   - ✓ Verify provider removed

### Database Verification

```sql
-- Check current active provider
SELECT provider_name, is_active, is_enabled, model_name, last_test_result
FROM ai_providers
WHERE is_active = true;

-- Verify only one active
SELECT COUNT(*) FROM ai_providers WHERE is_active = true;
-- Should return 0 or 1, never more

-- Check all providers
SELECT provider_name, is_active, is_enabled, created_at
FROM ai_providers
ORDER BY created_at DESC;
```

## Summary

The AI Providers infrastructure layer is:

✅ **Complete**: All CRUD operations implemented
✅ **Secure**: API keys never exposed to frontend, admin-only access
✅ **Reliable**: Database constraints ensure consistency
✅ **Tested**: Real API validation on test
✅ **Decoupled**: Independent from Ask Doooda or other features
✅ **Ready**: Can be integrated with AI-powered features immediately

The infrastructure provides a single source of truth for AI provider configuration, with proper constraints ensuring only one provider is active at any time. Admin UI is fully functional for managing providers without any coupling to Ask Doooda execution.
