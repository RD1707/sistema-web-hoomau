import { supabase } from "../supabase/client";
import { logger, persistLog } from "../utils/logger";
import { sendText } from "../whatsapp/meta-api-client";
import { appendMessage } from "../services/conversations";

// Ao subir o bot, identifica conversas com mensagem do cliente recebida enquanto estava offline
// (last_inbound_at > last_bot_reply_at) e dispara mensagem de retomada uma única vez.
export async function runOfflineRecovery() {
  // Espera 5s para garantir inicialização
  setTimeout(execute, 5000);
}

async function execute() {
  try {
    const { data: cfg } = await supabase.from("bot_config").select("recovery_message, meta_phone_number_id, is_active").eq("id", 1).single();
    if (!cfg?.is_active || !cfg?.meta_phone_number_id) return;
    const recovery = cfg?.recovery_message || "Olá! Desculpa, estávamos offline. Como posso ajudar?";

    const { data, error } = await supabase
      .from("conversations")
      .select("id, last_inbound_at, last_bot_reply_at, recovery_sent_at, bot_paused, customers(phone)")
      .eq("bot_paused", false)
      .not("last_inbound_at", "is", null);

    if (error) { logger.warn({ error }, "Falha lendo conversas para recovery"); return; }

    for (const c of (data ?? []) as any[]) {
      const lastInbound = c.last_inbound_at ? new Date(c.last_inbound_at).getTime() : 0;
      const lastReply   = c.last_bot_reply_at ? new Date(c.last_bot_reply_at).getTime() : 0;
      const lastRecover = c.recovery_sent_at ? new Date(c.recovery_sent_at).getTime() : 0;

      // só dispara se cliente mandou DEPOIS da última resposta do bot
      // E se a última recovery não foi enviada depois do último inbound (anti-spam)
      if (lastInbound <= lastReply) continue;
      if (lastRecover >= lastInbound) continue;

      const phone = c.customers?.phone;
      if (!phone) continue;

      try {
        await sendText(cfg.meta_phone_number_id, phone, recovery);
        await appendMessage({
          conversation_id: c.id, direction: "outbound", author: "bot", text: recovery
        });
        await supabase.from("conversations").update({
          recovery_sent_at: new Date().toISOString(),
          last_bot_reply_at: new Date().toISOString()
        }).eq("id", c.id);
        await persistLog("info", "Mensagem de retomada enviada", { phone });
      } catch (err) {
        logger.warn({ err, phone }, "Falha enviando recovery");
      }
    }
  } catch (err) {
    logger.error({ err }, "offline-recovery erro");
  }
}
