import { logger } from "../utils/logger";
import { supabase } from "../supabase/client";
import { searchProducts } from "../services/products";
import { buildSystemPrompt } from "./prompt-builder";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

type ReplyResult = {
  text: string;
  productIds: string[];
  imageUrls: string[];
  contextPatch?: Record<string, unknown>;
  detectedIntent?: string;
};

export async function generateBotReply(args: {
  userText: string;
  conversationId: string;
  customer: any;
  config: any;
}): Promise<ReplyResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallback("API Gemini não configurada.");

  // Histórico recente para contexto
  const { data: history } = await supabase
    .from("messages")
    .select("author, text")
    .eq("conversation_id", args.conversationId)
    .order("created_at", { ascending: false })
    .limit(10);

  const lastMessages = (history ?? []).reverse()
    .map((m) => `${m.author}: ${m.text ?? ""}`)
    .join("\n");

  const products = await searchProducts(args.userText, 5);
  const system = await buildSystemPrompt(args.config ?? {}, products,
    `HISTÓRICO RECENTE:\n${lastMessages}\n\nMENSAGEM DO CLIENTE: ${args.userText}`);

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: system }] }],
        generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
      })
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, "Gemini erro");
      return fallback("Tive um probleminha técnico, pode repetir?");
    }
    const json = await res.json();
    const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsed = safeJson(raw);
    return {
      text: parsed.text || "Desculpe, não consegui entender. Pode repetir?",
      productIds: Array.isArray(parsed.product_ids) ? parsed.product_ids : [],
      imageUrls: Array.isArray(parsed.image_urls) ? parsed.image_urls : [],
      contextPatch: parsed.context && typeof parsed.context === "object" ? parsed.context : undefined,
      detectedIntent: typeof parsed.intent === "string" ? parsed.intent : "outro"
    };
  } catch (err) {
    logger.error({ err }, "Gemini falhou");
    return fallback("Estou com instabilidade no momento, pode aguardar um instante?");
  }
}

function safeJson(s: string) {
  try { return JSON.parse(s); } catch { return {}; }
}
function fallback(text: string): ReplyResult {
  return { text, productIds: [], imageUrls: [], detectedIntent: "outro" };
}
