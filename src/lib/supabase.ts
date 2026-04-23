import { createClient } from "@supabase/supabase-js";

// As variáveis vêm do .env (ou das envs configuradas no Lovable / Vercel).
// Veja o README na raiz para instruções de configuração.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  // Em dev, exibimos uma mensagem clara.
  // eslint-disable-next-line no-console
  console.error(
    "[Supabase] Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env do painel.",
  );
}

export const supabase = createClient(url ?? "https://invalid.supabase.co", key ?? "anon", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const isSupabaseConfigured = Boolean(url && key);
