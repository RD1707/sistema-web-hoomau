# Sistema de Atendimento WhatsApp para Loja de Autopeças (Webhook Meta API)

Este projeto contém DUAS partes que compartilham o mesmo banco Supabase:

1. **Painel Admin** — aplicação web (React + Vite + TypeScript) onde o administrador da loja de autopeças cadastra os produtos (com compatibilidade e marcas, podendo importar via CSV), gerencia o painel da API Oficial da Meta e acompanha as conversas. Pode ser publicada na Vercel, Netlify, Cloudflare Pages, etc.
2. **Bot WhatsApp (Webhook Server)** — serviço Node.js + TypeScript (Express) atuando como Webhook para a **API Oficial da Meta (WhatsApp Business Platform)**. Ele recebe eventos da Meta (mensagens de clientes) e responde através do **Google Gemini 1.5 Flash**, utilizando `Full-Text Search` do Supabase para buscas super rápidas no catálogo.

O Gemini atua duplamente, realizando tanto a comunicação com o cliente quanto a classificação oculta da intenção da mensagem (compra, dúvida, compatibilidade, etc.).

---

## SUMÁRIO

1. Pré-requisitos
2. Configurar Supabase e Banco de Dados
3. Obter Chave do Google Gemini
4. Configurar App na Meta for Developers (WhatsApp API)
5. Rodar o Painel Admin
6. Rodar o Webhook Server (Bot)
7. Solução de Problemas

---

## 1. PRÉ-REQUISITOS

- Node.js 20 ou superior — https://nodejs.org
- Conta no Supabase — https://supabase.com
- Conta no Google AI Studio (Gemini) — https://aistudio.google.com
- Conta na Meta for Developers (para acessar a API Oficial do WhatsApp)

---

## 2. CONFIGURAR SUPABASE E BANCO DE DADOS

### 2.1 Criar o projeto

1. Acesse https://supabase.com e clique em **New project**.
2. Preencha os dados e aguarde a criação.

### 2.2 Rodar o Script de Banco (Schema Completo)

A aplicação de autopeças requer a estrutura completa (que já inclui a busca `tsvector` super rápida e permissões).
1. Abra a aba **SQL Editor** no painel do seu Supabase.
2. Copie o conteúdo inteiro do arquivo `sql/schema_completo.sql` presente neste repositório.
3. Cole no editor e clique em **Run**. Aguarde o aviso de sucesso. Este script criará todas as tabelas, as políticas de segurança (RLS) e o bucket de armazenamento `product-images`.

### 2.3 Criar o Usuário Admin
Seu painel estará protegido e acessível apenas por administradores.
1. No painel do Supabase, vá em **Authentication > Users > Add user > Create new user**.
2. Preencha email e senha. Marque "Auto Confirm User".
3. Após criar, copie o **UID** (User ID) gerado para este usuário.
4. Volte ao **SQL Editor** e execute este comando (substituindo o UUID):
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('SEU_UUID_COPIADO', 'admin');
   ```

### 2.4 Pegar as chaves de Conexão

Vá em **Project Settings > API**:
- `Project URL` — necessário tanto para o painel quanto para o bot.
- `anon public` — necessário APENAS para o painel (`VITE_SUPABASE_PUBLISHABLE_KEY`).
- `service_role` — necessário APENAS para o bot backend (`SUPABASE_SERVICE_ROLE_KEY`). NUNCA exponha esta chave publicamente!

---

## 3. OBTER CHAVE DO GOOGLE GEMINI

1. Entre em https://aistudio.google.com/app/apikey.
2. Clique em **Create API key**.
3. Copie a chave (ela será colocada no `.env` do bot backend).

*(Nota: O Cohere foi descontinuado neste fluxo otimizado; o Gemini assumiu a inteligência total da conversa e a classificação das intenções de forma assíncrona).*

---

## 4. CONFIGURAR APP NA META FOR DEVELOPERS

Para que seu bot funcione, ele precisará estar interligado ao WhatsApp da Meta.

1. Acesse https://developers.facebook.com/ e crie um App do tipo "Empresa".
2. No menu do app, adicione o produto **WhatsApp**.
3. Acesse a aba de **Configuração da API** e anote:
   - **ID do número de telefone**.
   - **Token de Acesso** (Gere um provisório para testes, ou um permanente no Business Manager).
4. No **Painel Admin Web** deste projeto (Aba *Configurações do Bot*), preencha o ID, o Token de Acesso, e crie um **Token de Verificação** ao seu gosto (exemplo: `MeuTokenSeguro123`).
5. **Configurando o Webhook na Meta**:
   - Vá na Meta for Developers, clique em Webhooks > WhatsApp Business Account.
   - Preencha a URL de Retorno: `https://seu-dominio-ou-ngrok.com/webhook`.
   - Preencha o Token de Verificação: `MeuTokenSeguro123`.
   - Marque os eventos **`messages`** nas assinaturas de webhook.

---

## 5. RODAR O PAINEL ADMIN

1. Crie um arquivo `.env` na pasta `web/` contendo:
   ```
   VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_anon_public
   ```
2. Inicie o sistema no terminal:
   ```bash
   cd web
   npm install
   npm run dev
   ```
3. Acesse http://localhost:8080, faça login e suba seu catálogo em `Produtos` (você pode usar o botão **Importar CSV** para cadastrar múltiplas peças e suas compatibilidades rapidamente). Preencha também o nome do bot e o horário de atendimento.

---

## 6. RODAR O WEBHOOK SERVER (BOT)

### 6.1 Configurando o .env

1. Crie o arquivo `.env` na pasta `whatsapp-bot/`:
   ```
   SUPABASE_URL=https://SEU_PROJETO.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
   GEMINI_API_KEY=sua_chave_gemini
   PORT=3001
   ```

2. Instale as dependências e faça a build de produção:
   ```bash
   cd whatsapp-bot
   npm install
   npm run build
   npm start
   ```

### 6.2 Teste Local com Ngrok
Como a Meta exige um servidor na internet para chamar o webhook, você pode expor sua máquina local via Ngrok.
Com o bot rodando na porta 3001 (`npm start`), abra um segundo terminal e execute:
```bash
ngrok http 3001
```
Use o link gerado pelo Ngrok (ex: `https://xxxx.ngrok-free.app/webhook`) lá na tela da Meta para validar o webhook. O bot retornará sucesso!

---

## 7. SOLUÇÃO DE PROBLEMAS

- **Webhook na Meta diz "Token inválido" ou "Erro de Verificação"**:
  Isso ocorre se a URL estiver incorreta (faltou o `/webhook` no final) ou se o `Token de Verificação` não bater exatamente com o que você digitou no Painel Admin. Confirme que o webhook server está rodando e conectando no Supabase ao ligar.
- **O bot leu, mas não responde**:
  Verifique os logs no terminal do bot. Se aparecer erro no envio da Meta, garanta que o seu `Token de Acesso` e `ID do Telefone` inseridos no Painel Admin Web não expiraram.
- **"Gemini falhou"**:
  Valide se sua chave API do Google Gemini está copiada e colada corretamente no arquivo `.env` do bot.
- **Busca Lenta de Produtos**:
  Essa versão usa indexação PostgreSQL Full-Text (*search_vector*). Se importar muitos itens, a tabela já faz a concatenação nativamente para a busca rápida. Não deve haver latência.
