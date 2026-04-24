import express from "express";
import cors from "cors";
import { logger } from "./utils/logger";
import { supabase } from "./supabase/client";
import { handleIncomingMessage } from "./core/message-handler";
import { startHeartbeat } from "./core/heartbeat";
import { startOutboundQueue } from "./core/outbound-queue";
import { runOfflineRecovery } from "./core/offline-recovery";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Validação de ambiente e conexão (Fail-fast na inicialização)
async function bootstrap() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.fatal("Variáveis de ambiente do Supabase não configuradas.");
    process.exit(1);
  }

  try {
    const { error } = await supabase.from("bot_config").select("id").limit(1);
    if (error) throw error;
    logger.info("Conexão com o banco de dados (Supabase) estabelecida.");
  } catch (err: any) {
    logger.fatal({ err }, "Falha ao conectar no banco de dados durante a inicialização.");
    process.exit(1);
  }

  // Iniciar serviços em background
  startHeartbeat();
  startOutboundQueue();
  runOfflineRecovery();

  app.listen(PORT, () => {
    logger.info(`Servidor Webhook rodando na porta ${PORT}`);
  });
}

// Endpoint de Verificação da Meta
app.get("/webhook", async (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token) {
    try {
      const { data, error } = await supabase.from("bot_config").select("webhook_verify_token").eq("id", 1).single();
      if (error) throw error;

      if (data?.webhook_verify_token === token) {
        logger.info("Webhook verificado com sucesso pela Meta!");
        res.status(200).send(challenge);
      } else {
        logger.warn("Token de verificação inválido.");
        res.sendStatus(403);
      }
    } catch (err) {
      logger.error({ err }, "Erro ao consultar token de verificação.");
      res.sendStatus(500);
    }
  } else {
    res.sendStatus(400);
  }
});

// Endpoint de Recebimento de Mensagens da Meta
app.post("/webhook", (req, res) => {
  const body = req.body;
  if (body.object) {
    if (
      body.entry && 
      body.entry[0].changes && 
      body.entry[0].changes[0] && 
      body.entry[0].changes[0].value.messages && 
      body.entry[0].changes[0].value.messages[0]
    ) {
      const msg = body.entry[0].changes[0].value.messages[0];
      const contact = body.entry[0].changes[0].value.contacts?.[0];
      const phoneId = body.entry[0].changes[0].value.metadata.phone_number_id;
      
      // Processa a mensagem em background para não travar o webhook
      handleIncomingMessage(msg, contact, phoneId).catch(err => {
        logger.error({ err, msgId: msg.id }, "Erro não tratado no processamento da mensagem.");
      });
    }
    // Sempre responde 200 OK para a Meta imediatamente
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

bootstrap();
