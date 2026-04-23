import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Users, Package, Activity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Stats = {
  conversationsToday: number;
  customersWeek: number;
  productsActive: number;
  pendingOutbound: number;
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    conversationsToday: 0, customersWeek: 0, productsActive: 0, pendingOutbound: 0
  });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

      const [a, b, c, d, recents] = await Promise.all([
        supabase.from("conversations").select("id", { count: "exact", head: true })
          .gte("last_message_at", todayStart.toISOString()),
        supabase.from("customers").select("id", { count: "exact", head: true })
          .gte("created_at", weekAgo.toISOString()),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("active", true),
        supabase.from("outbound_messages").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("messages")
          .select("id, text, direction, author, created_at, conversation_id, conversations(customer_id, customers(phone, name))")
          .order("created_at", { ascending: false }).limit(8)
      ]);

      setStats({
        conversationsToday: a.count ?? 0,
        customersWeek: b.count ?? 0,
        productsActive: c.count ?? 0,
        pendingOutbound: d.count ?? 0,
      });
      setRecent(recents.data ?? []);
    })();
  }, []);

  const cards = [
    { label: "Conversas hoje",        value: stats.conversationsToday, Icon: MessageSquare },
    { label: "Novos clientes (7d)",   value: stats.customersWeek,      Icon: Users },
    { label: "Produtos ativos",       value: stats.productsActive,     Icon: Package },
    { label: "Envios manuais pendentes", value: stats.pendingOutbound, Icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Visão geral</h1>
        <p className="text-sm text-muted-foreground">Resumo do atendimento de hoje.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.Icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Últimas mensagens</CardTitle>
          <CardDescription>Atividade recente em todas as conversas.</CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem mensagens ainda.</p>
          ) : (
            <ul className="divide-y">
              {recent.map((m: any) => (
                <li key={m.id} className="flex items-start gap-3 py-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    m.author === "customer" ? "bg-primary" : m.author === "bot" ? "bg-success" : "bg-warning"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium truncate">
                        {m.conversations?.customers?.name || m.conversations?.customers?.phone || "Cliente"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(m.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{m.text || "(sem texto)"}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
