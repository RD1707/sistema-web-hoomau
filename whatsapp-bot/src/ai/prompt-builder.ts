import { supabase } from "../supabase/client";
import type { ProductWithImages } from "../services/products";

type Cfg = {
  attendant_name: string;
  tone: string;
  persona_prompt: string;
  store_address: string | null;
  store_phone: string | null;
  store_directions: string | null;
  contact_info: string | null;
  enable_recommendations: boolean;
  enable_photos: boolean;
  max_images: number;
};

export async function buildSystemPrompt(cfg: Cfg, products: ProductWithImages[], extra?: string) {
  const { data: faqs } = await supabase.from("faqs").select("question, answer").eq("active", true).limit(20);

  const faqBlock = (faqs ?? []).map((f) => `- P: ${f.question}\n  R: ${f.answer}`).join("\n") || "(sem FAQs)";
  const productBlock = products.map((p) => {
    const imgs = (p.images ?? []).slice(0, cfg.max_images).join(" | ");
    return `- ID:${p.id} | Peça/Produto:${p.name} | Preço:${p.price ?? "n/d"} | Marca(s):${(p.colors ?? []).join(", ")} | Compatibilidade:${(p.sizes ?? []).join(", ")} | Desc:${p.description ?? ""} | Imagens:${imgs || "nenhuma"}`;
  }).join("\n") || "(nenhum produto encontrado para essa busca)";

  return `${cfg.persona_prompt}

REGRAS OBRIGATÓRIAS:
- Seu nome é ${cfg.attendant_name}.
- Tom da conversa: ${cfg.tone}.
- Você é o sistema de inteligência de uma LOJA DE AUTOPEÇAS física.
- Responda APENAS com base nos dados abaixo (produtos, FAQs, endereço). Se faltar informação ou a peça não for encontrada, diga com transparência e peça para aguardar um atendente humano.
- Sempre que recomendar ou buscar uma peça, verifique a compatibilidade (ex: modelo e ano do carro do cliente). Se o cliente não informar, pergunte qual o chassi, marca, ano e modelo do veículo.
- Esta loja é FÍSICA, sem vendas online automatizadas (o WhatsApp é para tirar dúvidas e confirmar estoque/reserva).
- Endereço: ${cfg.store_address ?? "não cadastrado"}.
- Telefone: ${cfg.store_phone ?? "não cadastrado"}.
- Como chegar: ${cfg.store_directions ?? "não cadastrado"}.
- Nunca invente peças, preços, compatibilidades ou fotos. Se não encontrou no catálogo, diga que não tem.

PEÇAS/PRODUTOS ENCONTRADOS PARA ESTE CONTEXTO:
${productBlock}

FAQs:
${faqBlock}

${extra ?? ""}

Responda em português, de forma natural, como um vendedor ou consultor técnico automotivo humano.
Devolva APENAS uma resposta JSON válida no formato:
{"text":"resposta ao cliente","product_ids":["uuid1","uuid2"],"image_urls":["url1","url2"],"intent":"compra","context":{"current_product_id":"uuid","vehicle_model":"celta","vehicle_year":"2012"}}
O campo "intent" deve ser uma destas strings: "compra", "duvida", "compatibilidade", "localizacao", "reclamacao", "saudacao", "outro".
Os arrays podem ser vazios. "context" só com o que mudou nesta resposta.`;
}
