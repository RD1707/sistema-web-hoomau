// Tipos simplificados das tabelas do banco. Sincronize com o schema SQL.
export type AppRole = "admin" | "attendant";

export type Category   = { id: string; name: string; slug: string; description: string | null; created_at: string };
export type Collection = { id: string; name: string; slug: string; description: string | null; created_at: string };

export type Product = {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  price: number | null;
  colors: string[];
  sizes: string[];
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductImage = {
  id: string;
  product_id: string;
  storage_path: string;
  public_url: string;
  position: number;
  is_primary: boolean;
  created_at: string;
};

export type Customer = {
  id: string;
  phone: string;
  name: string | null;
  city: string | null;
  neighborhood: string | null;
  preferences: Record<string, unknown>;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  customer_id: string;
  bot_paused: boolean;
  last_message_at: string | null;
  last_inbound_at: string | null;
  last_bot_reply_at: string | null;
  recovery_sent_at: string | null;
  unread_count: number;
  summary: string | null;
  intent: string | null;
  tags: string[];
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  author: "customer" | "bot" | "human";
  text: string | null;
  image_urls: string[];
  product_ids: string[];
  whatsapp_message_id: string | null;
  created_at: string;
};

export type BotConfig = {
  id: number;
  attendant_name: string;
  tone: string;
  persona_prompt: string;
  welcome_message: string;
  out_of_hours_message: string;
  recovery_message: string;
  store_address: string | null;
  store_phone: string | null;
  store_directions: string | null;
  contact_info: string | null;
  enable_recommendations: boolean;
  enable_photos: boolean;
  enable_data_collection: boolean;
  max_images: number;
};

export type Faq = { id: string; question: string; answer: string; active: boolean; position: number };

export type BusinessHour = {
  id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  closed: boolean;
};

export type BotStatus = {
  id: number;
  connection_status: "disconnected" | "qr_pending" | "connecting" | "connected";
  qr_code: string | null;
  last_heartbeat: string | null;
  whatsapp_number: string | null;
  messages_sent_today: number;
  messages_received_today: number;
  last_error: string | null;
  updated_at: string;
};

export type LogRow = {
  id: string;
  level: string;
  source: string | null;
  message: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};
