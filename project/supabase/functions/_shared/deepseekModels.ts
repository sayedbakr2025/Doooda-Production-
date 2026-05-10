export const DEEPSEEK_MODELS = {
  fallback: "deepseek-chat",
  askDoooda: "deepseek-v4-flash",
  critic: "deepseek-v4-pro",
} as const;

export type DeepSeekFeature = "ask_doooda" | "critic";

interface DeepSeekChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface DeepSeekChatCompletionOptions {
  apiKey: string;
  feature: DeepSeekFeature;
  messages: DeepSeekChatMessage[];
  temperature: number;
  maxTokens: number;
  responseFormat?: { type: string };
  timeoutMs?: number;
  logPrefix?: string;
}

interface DeepSeekChatCompletionResult {
  response: Response;
  modelUsed: string;
}

export function isDevelopmentMode(): boolean {
  const envName = (
    Deno.env.get("APP_ENV") ??
    Deno.env.get("ENV") ??
    Deno.env.get("NODE_ENV") ??
    ""
  ).toLowerCase();

  if (["development", "dev", "local"].includes(envName)) {
    return true;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  return supabaseUrl.includes("127.0.0.1") || supabaseUrl.includes("localhost");
}

export function getDeepSeekModel(feature: DeepSeekFeature): string {
  return feature === "critic" ? DEEPSEEK_MODELS.critic : DEEPSEEK_MODELS.askDoooda;
}

export async function callDeepSeekChatCompletion({
  apiKey,
  feature,
  messages,
  temperature,
  maxTokens,
  responseFormat,
  timeoutMs = 120000,
  logPrefix = "[AI]",
}: DeepSeekChatCompletionOptions): Promise<DeepSeekChatCompletionResult> {
  const primaryModel = getDeepSeekModel(feature);
  const modelsToTry = [primaryModel, DEEPSEEK_MODELS.fallback];
  const developmentMode = isDevelopmentMode();

  let lastError: Error | null = null;

  for (let index = 0; index < modelsToTry.length; index += 1) {
    const model = modelsToTry[index];
    const usedFallback = index > 0;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      console.log("[AI MODEL]", model);

      if (developmentMode) {
        console.log(`${logPrefix} Using model: ${model}`);
      }

      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          ...(responseFormat ? { response_format: responseFormat } : {}),
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastError = new Error(`DeepSeek API error: ${response.status} - ${errorText}`);

        if (!usedFallback) {
          if (developmentMode) {
            console.warn(`${logPrefix} Primary model failed, retrying with fallback.`);
          }
          continue;
        }

        throw lastError;
      }

      return { response, modelUsed: model };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!usedFallback) {
        if (developmentMode) {
          console.warn(`${logPrefix} Primary model threw, retrying with fallback.`, lastError.message);
        }
        continue;
      }

      throw lastError;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError ?? new Error("DeepSeek request failed");
}
