import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { ConfigBanner } from "@/components/ConfigBanner";

export default function Login() {
  const { signIn, session, loading, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (!loading && session) return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) toast({ title: "Erro ao entrar", description: error, variant: "destructive" });
    else navigate("/");
  }

  async function handleReset() {
    if (!email) {
      toast({ title: "Informe o email", description: "Digite o email para enviar o link de recuperação." });
      return;
    }
    setResetting(true);
    const { error } = await resetPassword(email);
    setResetting(false);
    if (error) toast({ title: "Erro", description: error, variant: "destructive" });
    else toast({ title: "Email enviado", description: "Verifique sua caixa de entrada." });
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary/40">
      <ConfigBanner />
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md card-elevated">
          <CardHeader className="space-y-1">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-semibold">
              L
            </div>
            <CardTitle className="text-center text-2xl">Painel da Loja</CardTitle>
            <CardDescription className="text-center">
              Acesso restrito ao administrador
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email" type="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="dono@loja.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password" type="password" autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
              <button
                type="button"
                onClick={handleReset}
                disabled={resetting}
                className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                Esqueci minha senha
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
