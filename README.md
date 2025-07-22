# Pepper Heads CRM

Um sistema completo de gerenciamento de relacionamento com clientes (CRM) desenvolvido especificamente para instituições de ensino, permitindo o controle eficiente de alunos, professores, cursos, turmas e salas.

## 🎯 Visão Geral

O Pepper Heads CRM é uma solução moderna e intuitiva que centraliza todas as operações de uma escola ou centro de treinamento, oferecendo:

- **Gestão de Alunos**: Controle completo do ciclo de vida do aluno (interessado → matriculado → concluído)
- **Administração de Professores**: Gerenciamento de docentes com controle financeiro automatizado
- **Catálogo de Cursos**: Organização por categorias com cálculo automático de rentabilidade
- **Planejamento de Turmas**: Criação inteligente com sugestões baseadas em demanda
- **Controle de Salas**: Gestão de espaços físicos com prevenção de conflitos
- **Dashboard Financeiro**: Acompanhamento de faturamento potencial e realizado

## 🚀 Tecnologias Utilizadas

### Frontend
- **React 18** - Biblioteca para interfaces de usuário
- **TypeScript** - Tipagem estática para JavaScript
- **Tailwind CSS** - Framework CSS utilitário
- **Lucide React** - Biblioteca de ícones
- **React Router DOM** - Roteamento para SPAs
- **React Hot Toast** - Notificações elegantes

### Backend & Database
- **Supabase** - Backend-as-a-Service com PostgreSQL
- **Row Level Security (RLS)** - Segurança a nível de linha
- **Real-time subscriptions** - Atualizações em tempo real

### Build & Development
- **Vite** - Build tool moderna e rápida
- **ESLint** - Linting para qualidade de código
- **PostCSS** - Processamento de CSS
- **Autoprefixer** - Prefixos CSS automáticos

## 📋 Pré-requisitos

- **Node.js** 18+ 
- **npm** ou **yarn**
- **Conta Supabase** (gratuita)
- **Git** para controle de versão

## 🛠️ Instalação

1. **Clone o repositório**
```bash
git clone <repository-url>
cd pepper-heads-crm
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais do Supabase:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Execute as migrações do banco**
```bash
# As migrações estão em /supabase/migrations/
# Execute-as no painel do Supabase ou via CLI
```

## 🚀 Como Executar

### Desenvolvimento
```bash
npm run dev
```
Acesse: `http://localhost:5173`

### Build para Produção
```bash
npm run build
```

### Preview da Build
```bash
npm run preview
```

### Linting
```bash
npm run lint
```

### Testes
```bash
# Executar testes
npm run test

# Executar testes com interface visual
npm run test:ui

# Executar testes com coverage
npm run test:coverage
```

## 📁 Estrutura de Pastas

```
pepper-heads-crm/
├── public/                 # Arquivos estáticos
│   └── favicon.webp       # Ícone da aplicação
├── src/                   # Código fonte
│   ├── components/        # Componentes reutilizáveis
│   │   ├── AuthForm.tsx   # Formulário de autenticação
│   │   ├── Layout.tsx     # Layout principal
│   │   ├── Login.tsx      # Página de login
│   │   ├── Modal*.tsx     # Modais específicos
│   │   └── ...
│   ├── hooks/             # Custom hooks
│   │   ├── useSupabaseQuery.ts # Hook para queries otimizadas
│   │   ├── useTurmas.ts   # Hook para gerenciar turmas
│   │   ├── useAlunos.ts   # Hook para gerenciar alunos
│   │   └── ...
│   ├── pages/             # Páginas principais
│   │   ├── Alunos.tsx     # Gestão de alunos
│   │   ├── Cursos.tsx     # Gestão de cursos
│   │   ├── Professores.tsx # Gestão de professores
│   │   ├── Turmas.tsx     # Gestão de turmas
│   │   └── Salas.tsx      # Gestão de salas
│   ├── lib/               # Configurações e utilitários
│   │   └── supabase.ts    # Cliente Supabase
│   │   └── queryClient.ts # Configuração React Query
│   ├── utils/             # Funções utilitárias
│   │   └── format.ts      # Formatação de dados
│   │   └── errorHandling.ts # Tratamento de erros
│   ├── __tests__/         # Testes automatizados
│   │   ├── utils/         # Testes de utilitários
│   │   ├── hooks/         # Testes de hooks
│   │   └── components/    # Testes de componentes
│   ├── App.tsx            # Componente raiz
│   ├── main.tsx           # Ponto de entrada
│   └── index.css          # Estilos globais
├── supabase/              # Configurações do banco
│   └── migrations/        # Migrações SQL
├── scripts/               # Scripts utilitários
│   └── create-fictional-students.js # Dados de teste
└── docs/                  # Documentação
    ├── ARCHITECTURE.md    # Arquitetura do sistema
    ├── API.md            # Documentação da API
    ├── CONTRIBUTING.md   # Guia de contribuição
    └── DEPLOYMENT.md     # Guia de deploy
```

## 📜 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Gera build de produção |
| `npm run preview` | Preview da build local |
| `npm run lint` | Executa linting do código |
| `npm run test` | Executa testes automatizados |
| `npm run test:ui` | Interface visual para testes |
| `npm run test:coverage` | Relatório de cobertura de testes |
| `npm run create-students` | Cria dados fictícios de alunos |

## 🔐 Autenticação

O sistema utiliza autenticação por email/senha via Supabase Auth:
- **Registro**: Criação de conta com email e senha
- **Login**: Autenticação segura
- **Sessão**: Gerenciamento automático de sessão
- **Logout**: Encerramento seguro da sessão

## 🎨 Design System

- **Cores principais**: Dark theme com acentos em teal
- **Tipografia**: Inter font family
- **Componentes**: Design consistente e responsivo
- **Animações**: Transições suaves e micro-interações
- **Responsividade**: Mobile-first approach

## 📊 Funcionalidades Principais

### ⚡ Otimizações Implementadas
- **TanStack Query**: Cache inteligente e sincronização automática de dados
- **Real-time Updates**: Atualizações automáticas via Supabase subscriptions
- **Validação Robusta**: Formulários com validação em tempo real usando Zod
- **Custom Hooks**: Lógica reutilizável e modular
- **Tratamento de Erros**: Mensagens de erro amigáveis e específicas
- **Testes Automatizados**: Cobertura de testes para funções críticas

### Gestão de Alunos
- Cadastro com períodos de disponibilidade
- Controle de interesse em cursos
- Acompanhamento do status (interessado/matriculado/concluído)
- Cálculo de faturamento potencial

### Gestão de Professores
- Cadastro com valor/hora
- Cálculo automático de valores a receber/recebidos
- Atribuição a turmas com controle de horas

### Gestão de Cursos
- Organização por categorias
- Cálculo de rentabilidade por hora
- Acompanhamento de demanda

### Gestão de Turmas
- Criação com validação de conflitos
- Sugestões inteligentes baseadas em demanda
- Controle de ocupação e faturamento
- Matricula de alunos interessados

### Gestão de Salas
- Controle de capacidade
- Prevenção de conflitos de agendamento

## 🔧 Configurações Importantes

### Supabase
- **RLS habilitado** em todas as tabelas
- **Políticas de segurança** para usuários autenticados
- **Triggers** para atualizações automáticas

### Vite
- **Hot Module Replacement** para desenvolvimento rápido
- **Tree shaking** para builds otimizadas
- **TypeScript** integrado

## 📈 Próximos Passos

- [ ] Relatórios avançados
- [ ] Integração com sistemas de pagamento
- [ ] Notificações push
- [ ] App mobile
- [ ] API REST pública
- [x] Cache otimizado com TanStack Query
- [x] Validação de formulários com Zod
- [x] Testes automatizados
- [x] Real-time subscriptions
- [x] Custom hooks para lógica reutilizável

## 🤝 Contribuindo

Veja [CONTRIBUTING.md](docs/CONTRIBUTING.md) para detalhes sobre como contribuir.

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

Para suporte, abra uma issue no repositório ou entre em contato através do email: suporte@pepperheads.com

---

Desenvolvido com ❤️ pela equipe Pepper Heads