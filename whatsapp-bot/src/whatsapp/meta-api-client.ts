import axios from "axios";
import { supabase } from "../supabase/client";
import { logger } from "../utils/logger";

export async function sendMetaMessage(phoneId: string, to: string, messagePayload: any) {
  try {
    const { data: config } = await supabase.from("bot_config").select("meta_api_token").eq("id", 1).single();
    if (!config?.meta_api_token) {
      throw new Error("Token da API da Meta não configurado.");
    }

    const response = await axios({
      method: "POST",
      url: `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      headers: {
        Authorization: `Bearer ${config.meta_api_token}`,
        "Content-Type": "application/json",
      },
      data: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        ...messagePayload,
      },
    });

    return response.data;
  } catch (error: any) {
    logger.error({ err: error.response?.data || error.message }, "Erro ao enviar mensagem via Meta API");
    throw error;
  }
}

export async function sendText(phoneId: string, to: string, text: string) {
  return sendMetaMessage(phoneId, to, {
    type: "text",
    text: { preview_url: true, body: text },
  });
}

export async function sendImage(phoneId: string, to: string, imageUrl: string) {
  return sendMetaMessage(phoneId, to, {
    type: "image",
    image: { link: imageUrl },
  });
}
