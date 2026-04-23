import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [hasRecoveryHash, setHasRecoveryHash] = useState(false);
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    setHasRecoveryHash(hash.includes("type=recovery"));
    setReady(true);
  }, []);

  if (ready && !hasRecoveryHash) return <Navigate to="/login" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Senha atualizada" }); navigate("/"); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 p-6">
      <Card className="w-full max-w-md card-elevated">
        <CardHeader><CardTitle>Definir nova senha</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="pwd">Nova senha</Label>
              <Input id="pwd" type="password" required minLength={8} value={pwd} onChange={(e) => setPwd(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy} className="w-full">Salvar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
