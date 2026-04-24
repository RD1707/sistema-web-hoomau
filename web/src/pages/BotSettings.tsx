import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Bot, Clock, MapPin, Link as LinkIcon, Eye, EyeOff } from "lucide-react";

export default function BotSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showVerifyToken, setShowVerifyToken] = useState(false);
  
  const [settings, setSettings] = useState<any>({
    bot_name: "",
    bot_persona: "",
    welcome_message: "",
    office_hours_start: "08:00",
    office_hours_end: "18:00",
    address: "",
    is_active: true,
    meta_api_token: "",
    meta_phone_number_id: "",
    webhook_verify_token: ""
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const { data, error } = await supabase
      .from("bot_config")
      .select("*")
      .eq("id", 1)
      .single();

    if (!error && data) {
      setSettings({
        bot_name: data.attendant_name || "",
        bot_persona: data.persona_prompt || "",
        welcome_message: data.welcome_message || "",
        office_hours_start: data.office_hours_start || "08:00",
        office_hours_end: data.office_hours_end || "18:00",
        address: data.store_address || "",
        is_active: data.is_active ?? true,
        meta_api_token: data.meta_api_token || "",
        meta_phone_number_id: data.meta_phone_number_id || "",
        webhook_verify_token: data.webhook_verify_token || ""
      });
    } else if (error) {
      console.error("Erro ao carregar configurações:", error.message);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    
    const { error } = await supabase
      .from("bot_config")
      .update({ 
        attendant_name: settings.bot_name,
        persona_prompt: settings.bot_persona,
        welcome_message: settings.welcome_message,
        office_hours_start: settings.office_hours_start,
        office_hours_end: settings.office_hours_end,
        store_address: settings.address,
        is_active: settings.is_active,
        meta_api_token: settings.meta_api_token,
        meta_phone_number_id: settings.meta_phone_number_id,
        webhook_verify_token: settings.webhook_verify_token,
        updated_at: new Date().toISOString()
      })
      .eq("id", 1);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configurações atualizadas!" });
      loadSettings();
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configurações do Bot</h1>
          <p className="text-sm text-muted-foreground">Ajuste o comportamento, conexão e informações da sua IA.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Salvar Alterações
        </Button>
      </div>

      <Tabs defaultValue="conexao" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="conexao">Conexão API</TabsTrigger>
          <TabsTrigger value="persona">Persona</TabsTrigger>
          <TabsTrigger value="horarios">Horários</TabsTrigger>
          <TabsTrigger value="info">Informações</TabsTrigger>
        </TabsList>

        <TabsContent value="conexao" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><LinkIcon className="h-5 w-5" /> Conexão com Meta (WhatsApp API)</CardTitle>
              <CardDescription>Configure as credenciais da API Oficial da Meta. Sem isso o bot não enviará nem receberá mensagens.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">ID do Número de Telefone</label>
                <Input 
                  value={settings.meta_phone_number_id}
                  onChange={(e) => setSettings({...settings, meta_phone_number_id: e.target.value})}
                  placeholder="Ex: 102345678901234" 
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Token de Acesso (Permanente)</label>
                <div className="relative">
                  <Input 
                    type={showToken ? "text" : "password"}
                    value={settings.meta_api_token}
                    onChange={(e) => setSettings({...settings, meta_api_token: e.target.value})}
                    placeholder="EAABx..." 
                  />
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Token de Verificação (Webhook)</label>
                <div className="relative">
                  <Input 
                    type={showVerifyToken ? "text" : "password"}
                    value={settings.webhook_verify_token}
                    onChange={(e) => setSettings({...settings, webhook_verify_token: e.target.value})}
                    placeholder="Crie um token forte e único..." 
                  />
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowVerifyToken(!showVerifyToken)}
                  >
                    {showVerifyToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="persona" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> Identidade do Bot</CardTitle>
              <CardDescription>Defina como o bot se apresenta e como ele deve falar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Nome do Atendente Virtual</label>
                <Input 
                  value={settings.bot_name}
                  onChange={(e) => setSettings({...settings, bot_name: e.target.value})}
                  placeholder="Ex: Maya da Hoomau" 
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Instruções de Personalidade (Persona)</label>
                <Textarea 
                  rows={4}
                  value={settings.bot_persona}
                  onChange={(e) => setSettings({...settings, bot_persona: e.target.value})}
                  placeholder="Ex: Você é uma atendente educada de uma loja de roupas..." 
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Mensagem de Boas-vindas</label>
                <Textarea 
                  value={settings.welcome_message}
                  onChange={(e) => setSettings({...settings, welcome_message: e.target.value})}
                  placeholder="Olá! Sou a assistente virtual da Hoomau..." 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="horarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Horário de Funcionamento</CardTitle>
              <CardDescription>Controle quando o bot deve responder automaticamente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Abertura</label>
                  <Input 
                    type="time" 
                    value={settings.office_hours_start}
                    onChange={(e) => setSettings({...settings, office_hours_start: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Fechamento</label>
                  <Input 
                    type="time" 
                    value={settings.office_hours_end}
                    onChange={(e) => setSettings({...settings, office_hours_end: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                <div className="space-y-0.5">
                  <label className="text-base font-medium">Bot Ativo</label>
                  <p className="text-sm text-muted-foreground">Ative ou desative o atendimento automático globalmente.</p>
                </div>
                <Switch 
                  checked={settings.is_active}
                  onCheckedChange={(checked) => setSettings({...settings, is_active: checked})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Localização</CardTitle>
              <CardDescription>Endereço físico da loja usado pela IA.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Endereço Completo</label>
                <Textarea 
                  value={settings.address}
                  onChange={(e) => setSettings({...settings, address: e.target.value})}
                  placeholder="Rua Exemplo, 123 - Centro..." 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}