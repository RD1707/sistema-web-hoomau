import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { BotStatus } from "@/types/db";
import { Wifi, WifiOff, QrCode, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function BotStatusBadge() {
  const [status, setStatus] = useState<BotStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.from("bot_status").select("*").eq("id", 1).maybeSingle();
      if (mounted) setStatus(data as BotStatus | null);
    };
    load();
    const t = setInterval(load, 15000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  const heartbeatOk = status?.last_heartbeat
    ? Date.now() - new Date(status.last_heartbeat).getTime() < 90_000
    : false;

  const effective = !heartbeatOk ? "disconnected" : status?.connection_status ?? "disconnected";

  const map = {
    connected:    { label: "Bot online",      cls: "bg-success/10 text-success border-success/30",   Icon: Wifi },
    qr_pending:   { label: "QR pendente",     cls: "bg-warning/10 text-warning border-warning/30",   Icon: QrCode },
    connecting:   { label: "Conectando…",     cls: "bg-muted text-muted-foreground border-border",   Icon: Loader2 },
    disconnected: { label: "Bot offline",     cls: "bg-destructive/10 text-destructive border-destructive/30", Icon: WifiOff },
  } as const;

  const { label, cls, Icon } = map[effective as keyof typeof map];

  return (
    <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium", cls)}>
      <Icon className={cn("h-3.5 w-3.5", effective === "connecting" && "animate-spin")} />
      {label}
    </div>
  );
}
