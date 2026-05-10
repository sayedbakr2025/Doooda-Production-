UPDATE ai_providers
SET model_name = 'deepseek-v4-flash',
    updated_at = now()
WHERE provider_name = 'deepseek'
  AND model_name IN ('deepseek-chat', 'deepseek-reasoner');
