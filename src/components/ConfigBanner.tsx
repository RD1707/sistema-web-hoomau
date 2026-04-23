import { isSupabaseConfigured } from "@/lib/supabase";
import { AlertTriangle } from "lucide-react";

export function ConfigBanner() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="border-b border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
      <div className="mx-auto flex max-w-5xl items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
        <div>
          <p className="font-medium">Configure as variáveis do Supabase</p>
          <p className="text-muted-foreground">
            Crie um <code className="rounded bg-background px-1">.env</code> com{" "}
            <code className="rounded bg-background px-1">VITE_SUPABASE_URL</code> e{" "}
            <code className="rounded bg-background px-1">VITE_SUPABASE_PUBLISHABLE_KEY</code> e
            reinicie o painel. Veja o README para detalhes.
          </p>
        </div>
      </div>
    </div>
  );
}
