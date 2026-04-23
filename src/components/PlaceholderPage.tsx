import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Construction className="h-5 w-5 text-primary" /> Em construção</CardTitle>
          <CardDescription>
            Esta página está prevista no plano. As tabelas no Supabase já estão prontas — a interface
            será adicionada nos próximos passos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Enquanto isso, todas as funcionalidades do bot WhatsApp já funcionam pelo backend.
            Veja o <strong>README</strong> para rodar o bot e o <code>sql/</code> para configurar o banco.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
