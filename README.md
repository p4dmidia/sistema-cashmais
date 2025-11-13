# CashMais - Sistema de Cashback com MLM

Sistema completo de cashback com marketing multinível de até 10 níveis, desenvolvido com backend Hono + Cloudflare Workers e frontend React.

## 🚀 Como Rodar o Projeto

### Pré-requisitos
- Node.js 18+
- NPM ou Yarn

### Instalação e Execução

1. **Clone e instale dependências:**
```bash
npm install
```

2. **Configure o ambiente:**
O projeto usa as seguintes variáveis de ambiente (já configuradas):
- `MOCHA_USERS_SERVICE_API_URL` - URL da API do serviço de usuários
- `MOCHA_USERS_SERVICE_API_KEY` - Chave da API do serviço de usuários

3. **Execute o projeto em desenvolvimento:**
```bash
npm run dev
```

4. **Acesse a aplicação:**
- Frontend: http://localhost:5173
- API Health Check: http://localhost:5173/health

### Build de Produção
```bash
npm run build
```

## 🔐 Credenciais de Demo

O sistema usa autenticação Google OAuth gerenciada pelo Mocha Users Service. Perfis de demonstração foram criados no banco:

### Perfis Demo Disponíveis:
- **Admin:** CPF 111.111.111-11 (role: admin)
- **Empresa:** CPF 222.222.222-22 (role: company) - "Loja Demo Ltda"  
- **Afiliado:** CPF 333.333.333-33 (role: affiliate)

> **Nota:** Como o sistema usa Google OAuth, os usuários reais precisam fazer login com suas contas Google. Os perfis demo acima são apenas referências no banco de dados e serão associados aos usuários reais quando fizerem login e completarem seus perfis.

## 🏗️ Arquitetura

### Stack Tecnológica:
- **Backend:** Hono + Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite)
- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Autenticação:** Google OAuth via Mocha Users Service
- **Roteamento:** React Router v7

### Estrutura de Papéis:
- **admin:** Acesso completo ao sistema e relatórios
- **company:** Empresa parceira - gerenciamento de operações e cashback
- **affiliate:** Afiliado - programa MLM e rede de indicações
- **cashier:** Operador de caixa - lançamento de compras e cupons

## 📊 Funcionalidades Implementadas (Parte 1)

✅ **Base do Projeto:**
- Estrutura completa backend + frontend
- Configuração de ambiente
- Health check endpoint (/health)

✅ **Autenticação:**
- Login via Google OAuth
- Sistema de papéis (admin, company, affiliate, cashier)
- Middleware de proteção de rotas
- Gestão de sessões com cookies HTTP-only

✅ **Banco de Dados:**
- Tabela `user_profiles` com CPF único, role, status ativo
- Índices otimizados para performance
- Seed data com perfis demo

✅ **Interface:**
- Tema escuro com acentos roxo/rosa (inspirado em cashmais.net.br)
- Design responsivo e moderno
- Páginas: Home, Login, Dashboard, Profile
- Componentes reutilizáveis e bem estruturados

## 🎯 Próximas Fases (Aguardando Aprovação)

**Parte 2:** Sistema de PIX e Cupons
- Integração com PIX para ativação de contas
- Geração de cupons sequenciais
- Validação e controle de cupons

**Parte 3:** Sistema de Compras e Cashback
- Lançamento de compras por empresas/caixas
- Cálculo automático de cashback
- Distribuição MLM de 10 níveis

**Parte 4:** Sistema de Saques e Relatórios
- Solicitação de saques com taxa de 30%
- Relatórios detalhados para todos os perfis
- Dashboard administrativo completo

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Verificação de tipos
npm run check

# Linting
npm run lint

# Gerar tipos do Cloudflare
npm run cf-typegen
```

## 📁 Estrutura do Projeto

```
src/
├── react-app/           # Frontend React
│   ├── components/      # Componentes reutilizáveis
│   ├── pages/          # Páginas da aplicação
│   └── hooks/          # Hooks personalizados
├── shared/             # Tipos compartilhados
└── worker/             # Backend Hono + Cloudflare Workers
```

## 🎨 Design System

- **Cores Primárias:** Roxo (#8B5CF6) e Rosa (#EC4899)
- **Tema:** Escuro com contrastes altos
- **Tipografia:** Inter (system font)
- **Ícones:** Lucide React
- **Espaçamento:** Grid 8px do Tailwind CSS

---

**Status:** ✅ Parte 1 Concluída - Aguardando aprovação para Parte 2
