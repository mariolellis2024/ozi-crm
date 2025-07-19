# Arquitetura do Sistema - Pepper Heads CRM

## 🏗️ Visão Geral da Arquitetura

O Pepper Heads CRM segue uma arquitetura moderna de **Single Page Application (SPA)** com backend serverless, proporcionando escalabilidade, performance e facilidade de manutenção.

## 📐 Diagrama de Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase      │    │   Database      │
│   (React/Vite)  │◄──►│   (BaaS)        │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌────▼────┐             ┌────▼────┐             ┌────▼────┐
    │ Router  │             │  Auth   │             │  Tables │
    │ Guards  │             │  API    │             │   RLS   │
    │ Layout  │             │ Storage │             │ Triggers│
    └─────────┘             └─────────┘             └─────────┘
```

## 🎯 Princípios Arquiteturais

### 1. **Separation of Concerns**
- **Apresentação**: Componentes React focados em UI
- **Lógica de Negócio**: Hooks customizados e utilitários
- **Dados**: Camada de acesso via Supabase client

### 2. **Component-Based Architecture**
```
App
├── Layout (Sidebar + Main)
├── Pages (Alunos, Professores, etc.)
├── Modals (Formulários específicos)
└── Shared Components (Buttons, Inputs, etc.)
```

### 3. **State Management**
- **Local State**: useState para estado de componente
- **Server State**: Supabase real-time subscriptions
- **Form State**: Controlled components
- **Global State**: Context API quando necessário

## 🔄 Fluxo de Dados

### 1. **Fluxo de Autenticação**
```
Login Form → Supabase Auth → Session Storage → Route Guard → Dashboard
```

### 2. **Fluxo CRUD Típico**
```
User Action → Form Validation → Supabase Client → Database → Real-time Update → UI Refresh
```

### 3. **Fluxo de Navegação**
```
Route Change → Auth Check → Component Mount → Data Fetch → Render
```

## 🗄️ Estrutura do Banco de Dados

### Entidades Principais

```sql
-- Categorias de cursos
categorias (id, nome, created_at)

-- Cursos oferecidos
cursos (id, nome, carga_horaria, preco, categoria_id, created_at)

-- Professores
professores (id, nome, email, whatsapp, valor_hora, created_at)

-- Salas físicas
salas (id, nome, cadeiras, created_at)

-- Alunos
alunos (id, nome, email, whatsapp, empresa, available_periods, created_at)

-- Turmas
turmas (id, name, curso_id, sala_id, cadeiras, period, start_date, end_date, 
        potencial_faturamento, imposto, created_at)

-- Relacionamento professor-turma
turma_professores (id, turma_id, professor_id, hours, created_at)

-- Interesse/matrícula de alunos
aluno_curso_interests (id, aluno_id, curso_id, turma_id, status, created_at)
```

### Relacionamentos

```
categorias 1:N cursos
cursos 1:N turmas
salas 1:N turmas
turmas N:M professores (via turma_professores)
alunos N:M cursos (via aluno_curso_interests)
turmas 1:N aluno_curso_interests
```

## 🔐 Segurança

### Row Level Security (RLS)
Todas as tabelas possuem RLS habilitado com políticas:

```sql
-- Exemplo de política
CREATE POLICY "Authenticated users can manage alunos"
ON alunos FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
```

### Autenticação
- **JWT Tokens** gerenciados pelo Supabase
- **Session Management** automático
- **Route Protection** via guards

## 📱 Camada de Apresentação

### Estrutura de Componentes

```
src/components/
├── Layout/
│   ├── Layout.tsx          # Layout principal
│   └── Sidebar.tsx         # Navegação lateral
├── Forms/
│   ├── AuthForm.tsx        # Formulário de login
│   ├── ModalAluno.tsx      # Modal de aluno
│   └── ...
├── UI/
│   ├── InputField.tsx      # Campo de entrada
│   ├── LoadingButton.tsx   # Botão com loading
│   └── ConfirmationModal.tsx
└── Shared/
    ├── OrganicBackground.tsx
    └── ...
```

### Padrões de Design

1. **Compound Components**: Modais com header, body, footer
2. **Render Props**: Para componentes de dados
3. **Custom Hooks**: Para lógica reutilizável
4. **Higher-Order Components**: Para autenticação

## 🔄 Gerenciamento de Estado

### Estado Local (useState)
```typescript
const [formData, setFormData] = useState({
  nome: '',
  email: '',
  // ...
});
```

### Estado do Servidor (Supabase)
```typescript
const [alunos, setAlunos] = useState<Aluno[]>([]);

useEffect(() => {
  loadAlunos();
}, []);

async function loadAlunos() {
  const { data } = await supabase
    .from('alunos')
    .select('*');
  setAlunos(data);
}
```

### Real-time Updates
```typescript
useEffect(() => {
  const subscription = supabase
    .channel('alunos')
    .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'alunos' },
        () => loadAlunos()
    )
    .subscribe();

  return () => subscription.unsubscribe();
}, []);
```

## 🎨 Sistema de Design

### Tema e Cores
```css
:root {
  --color-dark: #1A1D21;
  --color-dark-lighter: #22262B;
  --color-dark-card: #2A2F35;
  --color-teal-accent: #2CD3C7;
}
```

### Componentes Base
- **Cards**: Container padrão para conteúdo
- **Buttons**: Estados hover, loading, disabled
- **Inputs**: Validação visual e feedback
- **Modals**: Overlay com backdrop

### Animações
```css
.fade-in { animation: fadeIn 0.6s ease-out; }
.hover-lift { transition: transform 0.2s; }
.scale-in { animation: scaleIn 0.5s ease-out; }
```

## 🔧 Configurações e Build

### Vite Configuration
```typescript
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
```

### TypeScript Configuration
- **Strict mode** habilitado
- **Path mapping** para imports limpos
- **Type checking** em build time

### Tailwind Configuration
```javascript
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: { /* custom colors */ },
        teal: { accent: '#2CD3C7' }
      }
    }
  }
};
```

## 📊 Performance

### Otimizações Implementadas

1. **Code Splitting**: Lazy loading de rotas
2. **Tree Shaking**: Eliminação de código não usado
3. **Image Optimization**: WebP format
4. **CSS Purging**: Remoção de CSS não utilizado
5. **Bundle Analysis**: Monitoramento de tamanho

### Métricas Alvo
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Bundle Size**: < 500KB gzipped

## 🔍 Monitoramento e Logs

### Error Handling
```typescript
try {
  await supabase.from('alunos').insert(data);
  toast.success('Aluno criado com sucesso!');
} catch (error) {
  console.error('Erro ao criar aluno:', error);
  toast.error('Erro ao criar aluno');
}
```

### Debug Mode
```typescript
if (import.meta.env.DEV) {
  console.log('Debug info:', data);
}
```

## 🚀 Escalabilidade

### Horizontal Scaling
- **Supabase**: Auto-scaling do backend
- **CDN**: Distribuição global de assets
- **Edge Functions**: Processamento próximo ao usuário

### Vertical Scaling
- **Database Indexing**: Otimização de queries
- **Connection Pooling**: Gerenciamento eficiente de conexões
- **Caching**: Redis para dados frequentes

## 🔄 Padrões de Integração

### API Client Pattern
```typescript
class SupabaseClient {
  async getAlunos() {
    return this.supabase.from('alunos').select('*');
  }
  
  async createAluno(data: AlunoData) {
    return this.supabase.from('alunos').insert(data);
  }
}
```

### Repository Pattern
```typescript
interface AlunoRepository {
  findAll(): Promise<Aluno[]>;
  findById(id: string): Promise<Aluno>;
  create(data: AlunoData): Promise<Aluno>;
  update(id: string, data: Partial<AlunoData>): Promise<Aluno>;
  delete(id: string): Promise<void>;
}
```

## 📈 Roadmap Técnico

### Próximas Implementações
1. **Service Workers**: Cache offline
2. **PWA**: Instalação como app
3. **GraphQL**: API mais eficiente
4. **Micro-frontends**: Modularização
5. **Testing**: Cobertura completa

### Melhorias de Performance
1. **Virtual Scrolling**: Listas grandes
2. **Memoization**: Componentes pesados
3. **Suspense**: Loading states
4. **Concurrent Features**: React 18

---

Esta arquitetura garante um sistema robusto, escalável e de fácil manutenção, seguindo as melhores práticas da indústria.