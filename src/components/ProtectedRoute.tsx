import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h2 className="mb-2 text-xl font-semibold">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground">
            Sua conta não tem permissão de administrador. Rode o script{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">sql/04_admin_setup.sql</code> no Supabase
            adicionando o UID do seu usuário e tente novamente.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
