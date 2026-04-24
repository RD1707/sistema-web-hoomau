import { logger, persistLog } from "../utils/logger";
import { alreadyProcessed, shouldDebounce } from "../utils/anti-spam";
import { upsertCustomerByPhone } from "../services/customers";
import { getOrCreateConversation, appendMessage, updateConversationContext } from "../services/conversations";
import { isWithinBusinessHours } from "../services/business-hours";
import { generateBotReply } from "../ai/gemini";
import { sendText, sendImage } from "../whatsapp/meta-api-client";
import { supabase } from "../supabase/client";

function extractText(msg: any): string {
  if (msg.type === "text") return msg.text?.body?.trim() || "";
  if (msg.type === "image") return msg.image?.caption?.trim() || "";
  if (msg.type === "video") return msg.video?.caption?.trim() || "";
  if (msg.type === "interactive") {
    return msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "";
  }
  if (msg.type === "button") return msg.button?.text || "";
  return "";
}

export async function handleIncomingMessage(msg: any, contact: any, phoneId: string) {
  const messageId = msg.id || "";
  if (!messageId || alreadyProcessed(messageId)) return;

  const phone = msg.from; // This is the sender's phone number in Meta API
  if (!phone) return;

  const text = extractText(msg);
  if (!text) return; // Ignore non-text messages without captions for now

  // 1) Cliente + conversa
  const customer = await upsertCustomerByPhone(phone);
  // Optional: update customer name if provided by Meta
  if (contact?.profile?.name && !customer.name) {
    await supabase.from("customers").update({ name: contact.profile.name }).eq("id", customer.id);
  }

  const conversation = await getOrCreateConversation(customer.id);

  // 2) Anti-spam por conversa
  if (shouldDebounce(conversation.id)) {
    logger.debug({ phone }, "Debounce ativo, ignorando mensagem");
    return;
  }

  // 3) Persistir a mensagem do cliente
  await appendMessage({
    conversation_id: conversation.id,
    direction: "inbound",
    author: "customer",
    text,
    whatsapp_message_id: messageId
  });

  // 4) Se conversa pausada (takeover humano), não responde
  if (conversation.bot_paused) {
    logger.info({ phone }, "Conversa pausada (takeover humano) - bot não responde");
    return;
  }

  // 5) Carregar config
  const { data: cfg } = await supabase.from("bot_config").select("*").eq("id", 1).single();

  if (cfg && cfg.is_active === false) {
     logger.info({ phone }, "Bot desativado globalmente pelo painel.");
     return;
  }

  // 6) Fora do horário?
  if (!(await isWithinBusinessHours())) {
    try {
      await sendText(phoneId, phone, cfg?.out_of_hours_message || "Estamos fora do horário de atendimento.");
      await appendMessage({
        conversation_id: conversation.id,
        direction: "outbound",
        author: "bot",
        text: cfg?.out_of_hours_message || "Estamos fora do horário de atendimento."
      });
    } catch (err) {
      logger.error({ err, phone }, "Falha ao enviar mensagem de fora do horário");
    }
    return;
  }

  // 7) Gerar resposta via Gemini (já com intent embutido)
  const reply = await generateBotReply({
    userText: text,
    conversationId: conversation.id,
    customer,
    config: cfg
  });

  // Salva a intenção capturada pelo Gemini na conversa
  if (reply.detectedIntent) {
    supabase.from("conversations").update({ intent: reply.detectedIntent as any }).eq("id", conversation.id).then(({ error }) => {
      if (error) logger.warn({ err: error }, "Falha ao salvar intent capturada pelo Gemini");
    });
  }

  // 8) Enviar texto + imagens via Meta API (com resiliência individual)
  try {
    await sendText(phoneId, phone, reply.text);
  } catch (err) {
    logger.error({ err, phone }, "Falha ao enviar o texto da resposta via Meta API");
    return; // Se falhou o texto, abortamos pra evitar logar algo não enviado ou enviar só a imagem
  }

  for (const url of reply.imageUrls.slice(0, cfg?.max_images ?? 3)) {
    try {
      await sendImage(phoneId, phone, url);
    } catch (err) {
      logger.warn({ err, url }, "Falha ao enviar imagem da resposta via Meta API");
    }
  }

  // 9) Persistir resposta + atualizar contexto
  await appendMessage({
    conversation_id: conversation.id,
    direction: "outbound",
    author: "bot",
    text: reply.text,
    image_urls: reply.imageUrls,
    product_ids: reply.productIds
  });

  if (reply.contextPatch) {
    await updateConversationContext(conversation.id, reply.contextPatch);
  }

  await supabase.from("conversations").update({
    last_bot_reply_at: new Date().toISOString()
  }).eq("id", conversation.id);

  await persistLog("info", "Resposta enviada", { phone, intent: reply.detectedIntent });
}
