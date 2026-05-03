import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Criterion {
  name: string;
  description: string;
  weight: number;
}

interface EvaluationRequest {
  submission_id: string;
  work_title: string;
  work_summary: string;
  file_url?: string;
  criteria: Criterion[];
  institution_id: string;
  target_table?: "competition_submissions" | "institution_works";
}

function extractTextFromPdfBuffer(buffer: ArrayBuffer): string {
  try {
    const uint8 = new Uint8Array(buffer);
    const text = new TextDecoder("latin1").decode(uint8);
    const extracted: string[] = [];

    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    while ((match = streamRegex.exec(text)) !== null) {
      const streamContent = match[1];
      const textBlocks = streamContent.match(/\(([^)\\]|\\.)*\)/g);
      if (textBlocks) {
        for (const block of textBlocks) {
          const inner = block.slice(1, -1)
            .replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t")
            .replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\");
          if (inner.trim().length > 1) extracted.push(inner);
        }
      }
      const tjBlocks = streamContent.match(/\[((?:[^[\]]*(?:\([^)]*\))[^[\]]*)*)\]\s*TJ/g);
      if (tjBlocks) {
        for (const block of tjBlocks) {
          const strings = block.match(/\(([^)\\]|\\.)*\)/g);
          if (strings) {
            const joined = strings.map(s => s.slice(1, -1)
              .replace(/\\n/g, "\n").replace(/\\r/g, "\r")
              .replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\")
            ).join("");
            if (joined.trim().length > 1) extracted.push(joined);
          }
        }
      }
    }
    const result = extracted.join(" ").replace(/\s+/g, " ").trim();
    return result.length > 50 ? result.slice(0, 4000) : "";
  } catch {
    return "";
  }
}

async function callDeepSeek(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured");

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-reasoner",
      messages: [
        {
          role: "system",
          content: "You are an expert literary evaluator. Analyze creative works based on given criteria and provide detailed, fair assessments. Always respond in the same language as the work summary provided. Respond with pure JSON only, no markdown.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function extractStoragePath(fileUrl: string): { bucket: string; path: string } | null {
  try {
    const url = new URL(fileUrl);
    const match = url.pathname.match(/\/storage\/v1\/object\/(?:public\/|authenticated\/)?([^/]+)\/(.+)/);
    if (match) {
      return { bucket: match[1], path: match[2] };
    }
    return null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: EvaluationRequest = await req.json();
    const { submission_id, work_title, work_summary, file_url, criteria, institution_id, target_table = "competition_submissions" } = body;

    if (!submission_id || !criteria || criteria.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let workText = (work_summary || "").slice(0, 3000);

    if (!workText && file_url) {
      try {
        const fileRes = await fetch(file_url, { signal: AbortSignal.timeout(15000) });
        if (fileRes.ok) {
          const contentType = fileRes.headers.get("content-type") || "";
          if (contentType.includes("text/plain")) {
            const raw = await fileRes.text();
            workText = raw.slice(0, 4000);
          } else if (contentType.includes("pdf") || file_url.toLowerCase().includes(".pdf")) {
            const buf = await fileRes.arrayBuffer();
            workText = extractTextFromPdfBuffer(buf);
          }
        }
      } catch {
        workText = "";
      }
    }

    const hasContent = workText.trim().length > 20;
    const contentSection = hasContent
      ? `Work Content:\n---\n${workText}\n---`
      : `Note: No readable text was extracted from the file (may be an image-based or illustrated PDF such as a children's book). Evaluate based on the title and genre context provided.`;

    const criteriaDetails = criteria.map(c => `- ${c.name} (weight: ${c.weight}%): ${c.description}`).join("\n");

    const finalPrompt = `Evaluate the creative work titled "${work_title}".

${contentSection}

Evaluation Criteria:
${criteriaDetails}

Respond with a JSON object using this exact structure:
{
  "compatibility_score": <number 0-100>,
  "criteria_scores": {
    ${criteria.map(c => `"${c.name}": { "score": <0-100>, "justification": "<explanation>" }`).join(",\n    ")}
  },
  "final_report": "<comprehensive evaluation paragraph>",
  "strengths": "<key strengths>",
  "weaknesses": "<areas for improvement>",
  "problem_locations": "<specific areas needing attention or N/A>"
}`;

    const finalResponse = await callDeepSeek(finalPrompt);

    let evaluation: Record<string, unknown>;
    try {
      const cleanJson = finalResponse.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      evaluation = JSON.parse(cleanJson);
    } catch {
      evaluation = {
        compatibility_score: 70,
        criteria_scores: Object.fromEntries(
          criteria.map(c => [c.name, { score: 70, justification: "Analysis completed" }])
        ),
        final_report: finalResponse,
        strengths: "Work has been analyzed",
        weaknesses: "See full report",
        problem_locations: "N/A",
      };
    }

    const now = new Date().toISOString();

    await supabase
      .from(target_table)
      .update({
        ai_evaluation: evaluation,
        ai_evaluated_at: now,
        work_summary: "",
        file_url: null,
        content_deleted_at: now,
      })
      .eq("id", submission_id);

    if (file_url) {
      const storageRef = extractStoragePath(file_url);
      if (storageRef) {
        await supabase.storage
          .from(storageRef.bucket)
          .remove([storageRef.path]);
      }
    }

    return new Response(
      JSON.stringify(evaluation),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
