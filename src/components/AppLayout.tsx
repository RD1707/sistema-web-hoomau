import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { BotStatusBadge } from "./BotStatusBadge";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-secondary/30">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b bg-background px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-sm font-medium text-muted-foreground">Painel administrativo</h1>
            </div>
            <BotStatusBadge />
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
