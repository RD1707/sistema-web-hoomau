import { supabase } from "../supabase/client";
import { logger, persistLog } from "../utils/logger";
import { sendText, sendImage } from "../whatsapp/meta-api-client";
import { appendMessage } from "../services/conversations";

const POLL_MS = Number(process.env.OUTBOUND_POLL_MS || 3000);

// Consome a fila outbound_messages criada pelo painel (envios manuais do dono).
export function startOutboundQueue() {
  setInterval(processOnce, POLL_MS);
}

async function processOnce() {
  try {
    const { data: cfg } = await supabase.from("bot_config").select("meta_phone_number_id, is_active").eq("id", 1).single();
    if (!cfg?.is_active || !cfg?.meta_phone_number_id) return;

    const { data, error } = await supabase
      .from("outbound_messages")
      .select("id, conversation_id, text, image_urls, attempts, conversations(customer_id, customers(phone))")
      .eq("status", "pending")
      .lt("attempts", 5)
      .order("created_at", { ascending: true })
      .limit(5);

    if (error) { logger.warn({ error }, "Falha lendo outbound"); return; }
    if (!data?.length) return;

    for (const row of data as any[]) {
      const phone = row?.conversations?.customers?.phone;
      if (!phone) {
        await markFailed(row.id, "Telefone não encontrado", row.attempts);
        continue;
      }
      
      try {
        if (row.text) await sendText(cfg.meta_phone_number_id, phone, row.text);
        for (const url of row.image_urls ?? []) {
          await sendImage(cfg.meta_phone_number_id, phone, url);
        }
        
        await supabase.from("outbound_messages").update({
          status: "sent", sent_at: new Date().toISOString(), attempts: row.attempts + 1
        }).eq("id", row.id);

        await appendMessage({
          conversation_id: row.conversation_id,
          direction: "outbound",
          author: "human",
          text: row.text,
          image_urls: row.image_urls ?? []
        });
      } catch (err) {
        logger.error({ err, id: row.id }, "Falha enviando outbound");
        await markFailed(row.id, String(err), row.attempts);
        await persistLog("error", "Falha enviando outbound", { id: row.id, err: String(err) });
      }
    }
  } catch (err) {
    logger.error({ err }, "outbound-queue erro geral");
  }
}

async function markFailed(id: string, error: string, attempts: number) {
  const next = attempts + 1;
  await supabase.from("outbound_messages").update({
    status: next >= 5 ? "failed" : "pending",
    attempts: next,
    error
  }).eq("id", id);
}
