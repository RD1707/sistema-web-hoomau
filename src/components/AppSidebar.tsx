import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, FolderTree, Users, MessageSquare,
  Settings, Activity, UserCircle, LogOut
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Dashboard",    url: "/",              icon: LayoutDashboard },
  { title: "Produtos",     url: "/produtos",      icon: Package },
  { title: "Categorias",   url: "/categorias",    icon: FolderTree },
  { title: "Clientes",     url: "/clientes",      icon: Users },
  { title: "Conversas",    url: "/conversas",     icon: MessageSquare },
  { title: "Configurações",url: "/configuracoes", icon: Settings },
  { title: "Logs e Status",url: "/logs",          icon: Activity },
  { title: "Conta",        url: "/conta",         icon: UserCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold">
            L
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">Painel da Loja</span>
              <span className="text-xs text-muted-foreground">Atendimento WhatsApp</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <RouterNavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={({ isActive: a }) =>
                          `${a || isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/60"}`
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </RouterNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && user?.email && (
          <p className="mb-2 truncate px-1 text-xs text-muted-foreground">{user.email}</p>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => signOut()}>
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
