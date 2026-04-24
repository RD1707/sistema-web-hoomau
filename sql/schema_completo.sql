-- =====================================================================
-- SISTEMA DE ATENDIMENTO WHATSAPP (LOJA DE AUTOPEÇAS) - SCHEMA COMPLETO
-- Cole este arquivo no SQL Editor do Supabase e execute uma única vez.
-- Cria: enums, tabelas, funções, triggers, RLS, Storage bucket e policies.
-- =====================================================================

-- ---------- EXTENSIONS ----------
create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
do $$ begin
  create type public.app_role as enum ('admin', 'attendant');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.message_direction as enum ('inbound', 'outbound');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.message_author as enum ('customer', 'bot', 'human');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.outbound_status as enum ('pending', 'sent', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.intent_type as enum ('compra', 'duvida', 'compatibilidade', 'localizacao', 'reclamacao', 'saudacao', 'outro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.bot_connection_status as enum ('disconnected', 'qr_pending', 'connecting', 'connected');
exception when duplicate_object then null; end $$;

-- ---------- PROFILES ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- USER ROLES (separate table - prevents privilege escalation) ----------
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz default now(),
  unique (user_id, role)
);

-- Security definer function to check role (avoids RLS recursion)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- ---------- CATEGORIES ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  created_at timestamptz default now()
);

-- ---------- COLLECTIONS ----------
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  created_at timestamptz default now()
);

-- ---------- PRODUCTS ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  price numeric(10,2),
  colors text[] default '{}', -- Utilizado como "Marcas" no front-end de autopeças
  sizes text[] default '{}',  -- Utilizado como "Compatibilidade" (ex: Celta 2012)
  notes text,
  active boolean default true,
  search_vector tsvector generated always as (
    setweight(to_tsvector('portuguese', coalesce(name, '')), 'A') || 
    setweight(to_tsvector('portuguese', coalesce(description, '')), 'B')
  ) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_products_active on public.products(active);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_search on public.products using GIN (search_vector);

-- ---------- PRODUCT_IMAGES ----------
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade not null,
  storage_path text not null,
  public_url text not null,
  position int default 0,
  is_primary boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_product_images_product on public.product_images(product_id);

-- ---------- PRODUCT_COLLECTIONS (M:N) ----------
create table if not exists public.product_collections (
  product_id uuid references public.products(id) on delete cascade not null,
  collection_id uuid references public.collections(id) on delete cascade not null,
  primary key (product_id, collection_id)
);

-- ---------- CUSTOMERS ----------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  name text,
  city text,
  neighborhood text,
  preferences jsonb default '{}'::jsonb,
  tags text[] default '{}',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_customers_phone on public.customers(phone);

-- ---------- CONVERSATIONS ----------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade not null,
  bot_paused boolean default false,
  last_message_at timestamptz,
  last_inbound_at timestamptz,
  last_bot_reply_at timestamptz,
  recovery_sent_at timestamptz,
  unread_count int default 0,
  summary text,
  intent public.intent_type,
  tags text[] default '{}',
  context jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (customer_id)
);
create index if not exists idx_conversations_last_message on public.conversations(last_message_at desc);
create index if not exists idx_conversations_paused on public.conversations(bot_paused);

-- ---------- MESSAGES ----------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  direction public.message_direction not null,
  author public.message_author not null,
  text text,
  image_urls text[] default '{}',
  product_ids uuid[] default '{}',
  whatsapp_message_id text,
  created_at timestamptz default now()
);
create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at);

-- ---------- OUTBOUND_MESSAGES (fila para o bot enviar) ----------
create table if not exists public.outbound_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  text text,
  image_urls text[] default '{}',
  status public.outbound_status default 'pending',
  attempts int default 0,
  error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  sent_at timestamptz
);
create index if not exists idx_outbound_status on public.outbound_messages(status, created_at);

-- ---------- BOT_CONFIG (singleton) ----------
create table if not exists public.bot_config (
  id int primary key default 1,
  attendant_name text default 'Atendente Virtual',
  tone text default 'amigavel',
  persona_prompt text default 'Você é um vendedor virtual amigável de uma loja de autopeças física. Sempre pergunte o chassi, ano e modelo do carro do cliente para checar compatibilidade. Oriente o cliente a visitar a loja ou consultar um mecânico caso tenha dúvida técnica profunda.',
  welcome_message text default 'Olá! Bem-vindo(a) à nossa loja de autopeças. Como posso ajudar? Qual o modelo e ano do seu veículo?',
  out_of_hours_message text default 'Olá! Estamos fora do horário de atendimento. Voltaremos a responder no próximo horário comercial.',
  recovery_message text default 'Olá! Desculpa, estávamos offline. Como posso ajudar?',
  store_address text,
  store_phone text,
  store_directions text,
  contact_info text,
  enable_recommendations boolean default true,
  enable_photos boolean default true,
  enable_data_collection boolean default true,
  max_images int default 3,
  meta_api_token text,
  meta_phone_number_id text,
  webhook_verify_token text,
  is_active boolean default true,
  updated_at timestamptz default now(),
  constraint singleton check (id = 1)
);
insert into public.bot_config (id) values (1) on conflict (id) do nothing;

-- ---------- FAQS ----------
create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  active boolean default true,
  position int default 0,
  created_at timestamptz default now()
);

-- ---------- BUSINESS_HOURS ----------
create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  day_of_week int not null check (day_of_week between 0 and 6),
  open_time time,
  close_time time,
  closed boolean default false,
  unique (day_of_week)
);
insert into public.business_hours (day_of_week, open_time, close_time, closed) values
  (0, null, null, true),
  (1, '08:00', '18:00', false),
  (2, '08:00', '18:00', false),
  (3, '08:00', '18:00', false),
  (4, '08:00', '18:00', false),
  (5, '08:00', '18:00', false),
  (6, '08:00', '12:00', false)
on conflict (day_of_week) do nothing;

-- ---------- BOT_STATUS (singleton) ----------
create table if not exists public.bot_status (
  id int primary key default 1,
  connection_status public.bot_connection_status default 'disconnected',
  qr_code text,
  last_heartbeat timestamptz,
  whatsapp_number text,
  messages_sent_today int default 0,
  messages_received_today int default 0,
  last_error text,
  updated_at timestamptz default now(),
  constraint singleton_status check (id = 1)
);
insert into public.bot_status (id) values (1) on conflict (id) do nothing;

-- ---------- LOGS ----------
create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  level text not null,
  source text,
  message text not null,
  meta jsonb,
  created_at timestamptz default now()
);
create index if not exists idx_logs_created on public.logs(created_at desc);

-- ---------- TIMESTAMP TRIGGERS ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_customers_updated on public.customers;
create trigger trg_customers_updated before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists trg_conversations_updated on public.conversations;
create trigger trg_conversations_updated before update on public.conversations
for each row execute function public.set_updated_at();

drop trigger if exists trg_bot_config_updated on public.bot_config;
create trigger trg_bot_config_updated before update on public.bot_config
for each row execute function public.set_updated_at();

drop trigger if exists trg_bot_status_updated on public.bot_status;
create trigger trg_bot_status_updated before update on public.bot_status
for each row execute function public.set_updated_at();

-- ---------- AUTO-CREATE PROFILE ON SIGNUP ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =====================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================

alter table public.profiles            enable row level security;
alter table public.user_roles          enable row level security;
alter table public.categories          enable row level security;
alter table public.collections         enable row level security;
alter table public.products            enable row level security;
alter table public.product_images      enable row level security;
alter table public.product_collections enable row level security;
alter table public.customers           enable row level security;
alter table public.conversations       enable row level security;
alter table public.messages            enable row level security;
alter table public.outbound_messages   enable row level security;
alter table public.bot_config          enable row level security;
alter table public.faqs                enable row level security;
alter table public.business_hours      enable row level security;
alter table public.bot_status          enable row level security;
alter table public.logs                enable row level security;

drop policy if exists "profile self read"   on public.profiles;
drop policy if exists "profile self update" on public.profiles;
create policy "profile self read"   on public.profiles for select using (auth.uid() = id);
create policy "profile self update" on public.profiles for update using (auth.uid() = id);

drop policy if exists "roles self read"  on public.user_roles;
drop policy if exists "roles admin all"  on public.user_roles;
create policy "roles self read" on public.user_roles for select using (auth.uid() = user_id);
create policy "roles admin all" on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "categories admin all" on public.categories;
create policy "categories admin all" on public.categories for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "collections admin all" on public.collections;
create policy "collections admin all" on public.collections for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "products admin all" on public.products;
create policy "products admin all" on public.products for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "product_images admin all" on public.product_images;
create policy "product_images admin all" on public.product_images for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "product_collections admin all" on public.product_collections;
create policy "product_collections admin all" on public.product_collections for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "customers admin all" on public.customers;
create policy "customers admin all" on public.customers for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "conversations admin all" on public.conversations;
create policy "conversations admin all" on public.conversations for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "messages admin all" on public.messages;
create policy "messages admin all" on public.messages for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "outbound admin all" on public.outbound_messages;
create policy "outbound admin all" on public.outbound_messages for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "bot_config admin all" on public.bot_config;
create policy "bot_config admin all" on public.bot_config for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "faqs admin all" on public.faqs;
create policy "faqs admin all" on public.faqs for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "business_hours admin all" on public.business_hours;
create policy "business_hours admin all" on public.business_hours for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "bot_status admin read"  on public.bot_status;
create policy "bot_status admin read" on public.bot_status for select
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "logs admin read" on public.logs;
create policy "logs admin read" on public.logs for select
  using (public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- STORAGE
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product images public read"     on storage.objects;
drop policy if exists "product images admin insert"    on storage.objects;
drop policy if exists "product images admin update"    on storage.objects;
drop policy if exists "product images admin delete"    on storage.objects;

create policy "product images public read" on storage.objects for select using (bucket_id = 'product-images');
create policy "product images admin insert" on storage.objects for insert with check (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));
create policy "product images admin update" on storage.objects for update using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));
create policy "product images admin delete" on storage.objects for delete using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));
