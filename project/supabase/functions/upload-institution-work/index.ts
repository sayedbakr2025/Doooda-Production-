import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_EXTRACT_BYTES = 2 * 1024 * 1024;

function extractTextFromPdfBuffer(buffer: ArrayBuffer): string {
  try {
    const slice = buffer.byteLength > MAX_EXTRACT_BYTES
      ? buffer.slice(0, MAX_EXTRACT_BYTES)
      : buffer;
    const uint8 = new Uint8Array(slice);
    const text = new TextDecoder("latin1").decode(uint8);
    const extracted: string[] = [];

    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    let iterations = 0;
    while ((match = streamRegex.exec(text)) !== null && iterations < 100) {
      iterations++;
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
      if (extracted.join("").length > 5000) break;
    }

    const result = extracted.join(" ").replace(/\s+/g, " ").trim();
    return result.length > 50 ? result.slice(0, 4000) : "";
  } catch {
    return "";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Failed to parse form data: " + (e instanceof Error ? e.message : String(e)) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const file = formData.get("file") as File | null;
    const institutionId = formData.get("institution_id") as string | null;

    if (!file || !institutionId) {
      return new Response(
        JSON.stringify({ error: "file and institution_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: institution } = await supabase
      .from("institutional_accounts")
      .select("id")
      .eq("id", institutionId)
      .maybeSingle();

    if (!institution) {
      return new Response(
        JSON.stringify({ error: "Institution not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const fileName = `${institutionId}/${crypto.randomUUID()}.${ext}`;

    const fileBuffer = await file.arrayBuffer();

    const mimeType = file.type || (ext === "pdf" ? "application/pdf" : "application/octet-stream");

    const { error: uploadError } = await supabase.storage
      .from("institution-works")
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: "Storage upload failed: " + uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: signedData } = await supabase.storage
      .from("institution-works")
      .createSignedUrl(fileName, 60 * 60 * 24 * 365);

    let extractedText = "";
    if (ext === "txt" || mimeType === "text/plain") {
      try {
        extractedText = new TextDecoder("utf-8").decode(fileBuffer).slice(0, 4000);
      } catch {
        extractedText = "";
      }
    } else if (ext === "pdf" || mimeType === "application/pdf") {
      extractedText = extractTextFromPdfBuffer(fileBuffer);
    }

    return new Response(
      JSON.stringify({
        file_path: fileName,
        file_name: file.name,
        file_size: file.size,
        signed_url: signedData?.signedUrl || null,
        extracted_text: extractedText || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[upload-institution-work] error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
