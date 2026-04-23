import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import ProductForm from "./pages/ProductForm";
import Categories from "./pages/Categories";
import Customers from "./pages/Customers";
import Conversations from "./pages/Conversations";
import BotSettings from "./pages/BotSettings";
import Logs from "./pages/Logs";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/produtos" element={<Products />} />
              <Route path="/produtos/novo" element={<ProductForm />} />
              <Route path="/produtos/:id" element={<ProductForm />} />
              <Route path="/categorias" element={<Categories />} />
              <Route path="/clientes" element={<Customers />} />
              <Route path="/conversas" element={<Conversations />} />
              <Route path="/configuracoes" element={<BotSettings />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/conta" element={<Account />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </Routes></BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
