# Guia de Contribuição - Pepper Heads CRM

Obrigado por considerar contribuir para o Pepper Heads CRM! Este guia fornece todas as informações necessárias para contribuir de forma efetiva.

## 🤝 Como Contribuir

### 1. **Reportar Bugs**
- Use o template de issue para bugs
- Inclua passos para reproduzir
- Adicione screenshots quando relevante
- Especifique versão do navegador e sistema operacional

### 2. **Sugerir Melhorias**
- Use o template de feature request
- Descreva o problema que a feature resolve
- Proponha uma solução detalhada
- Considere alternativas

### 3. **Contribuir com Código**
- Fork o repositório
- Crie uma branch para sua feature
- Implemente as mudanças
- Adicione testes quando aplicável
- Submeta um Pull Request

## 🔧 Configuração do Ambiente

### Pré-requisitos
```bash
# Node.js 18+
node --version

# npm ou yarn
npm --version

# Git
git --version
```

### Setup Local
```bash
# 1. Fork e clone o repositório
git clone https://github.com/seu-usuario/pepper-heads-crm.git
cd pepper-heads-crm

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais do Supabase

# 4. Execute o projeto
npm run dev
```

### Configuração do Supabase
1. Crie uma conta no [Supabase](https://supabase.com)
2. Crie um novo projeto
3. Execute as migrações em `/supabase/migrations/`
4. Configure as variáveis no `.env`

## 📝 Padrões de Código

### TypeScript
```typescript
// ✅ Bom - Tipagem explícita
interface Usuario {
  id: string;
  nome: string;
  email: string;
  criadoEm: Date;
}

// ✅ Bom - Função tipada
async function criarUsuario(dados: Omit<Usuario, 'id' | 'criadoEm'>): Promise<Usuario> {
  // implementação
}

// ❌ Ruim - Uso de any
function processarDados(dados: any): any {
  // evitar
}
```

### React Components
```typescript
// ✅ Bom - Componente funcional com tipos
interface ModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export function Modal({ isOpen, title, children, onClose }: ModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

// ✅ Bom - Custom hook
function useAlunos() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadAlunos();
  }, []);
  
  async function loadAlunos() {
    try {
      setLoading(true);
      const { data } = await supabase.from('alunos').select('*');
      setAlunos(data || []);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
    } finally {
      setLoading(false);
    }
  }
  
  return { alunos, loading, loadAlunos };
}
```

### CSS/Tailwind
```typescript
// ✅ Bom - Classes organizadas e semânticas
<div className="
  flex items-center justify-between 
  p-6 bg-dark-card rounded-2xl 
  hover:bg-dark-lighter transition-colors
">
  <h3 className="text-xl font-semibold text-white">
    {titulo}
  </h3>
</div>

// ✅ Bom - Componente reutilizável
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  onClick 
}: ButtonProps) {
  const baseClasses = 'font-medium rounded-lg transition-colors';
  const variantClasses = {
    primary: 'bg-teal-accent text-dark hover:bg-teal-accent/90',
    secondary: 'bg-dark-lighter text-white hover:bg-dark-card',
    danger: 'bg-red-500 text-white hover:bg-red-600'
  };
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };
  
  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### Supabase Queries
```typescript
// ✅ Bom - Query tipada e tratamento de erro
async function buscarAlunosComCursos(): Promise<AlunoComCursos[]> {
  try {
    const { data, error } = await supabase
      .from('alunos')
      .select(`
        *,
        interesses:aluno_curso_interests(
          status,
          curso:cursos(nome, preco)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar alunos:', error);
    throw new Error('Falha ao carregar alunos');
  }
}

// ✅ Bom - Mutation com validação
async function criarAluno(dados: NovoAluno): Promise<Aluno> {
  // Validação
  if (!dados.nome?.trim()) {
    throw new Error('Nome é obrigatório');
  }
  if (!dados.whatsapp?.trim()) {
    throw new Error('WhatsApp é obrigatório');
  }
  
  try {
    const { data, error } = await supabase
      .from('alunos')
      .insert([dados])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar aluno:', error);
    throw new Error('Falha ao criar aluno');
  }
}
```

## 🧪 Testes

### Estrutura de Testes
```
src/
├── components/
│   ├── Button.tsx
│   └── __tests__/
│       └── Button.test.tsx
├── pages/
│   ├── Alunos.tsx
│   └── __tests__/
│       └── Alunos.test.tsx
└── utils/
    ├── format.ts
    └── __tests__/
        └── format.test.tsx
```

### Exemplo de Teste
```typescript
// src/utils/__tests__/format.test.ts
import { formatCurrency } from '../format';

describe('formatCurrency', () => {
  it('should format currency correctly', () => {
    expect(formatCurrency(1500)).toBe('R$ 1.500,00');
    expect(formatCurrency(0)).toBe('R$ 0,00');
    expect(formatCurrency(999.99)).toBe('R$ 999,99');
  });
});

// src/components/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('should render with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Executar Testes
```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm test -- --watch

# Executar testes com coverage
npm test -- --coverage
```

## 📋 Processo de Pull Request

### 1. **Preparação**
```bash
# Crie uma branch descritiva
git checkout -b feature/adicionar-relatorios
# ou
git checkout -b fix/corrigir-calculo-faturamento
```

### 2. **Desenvolvimento**
- Implemente as mudanças
- Adicione testes quando aplicável
- Mantenha commits pequenos e focados
- Use mensagens de commit descritivas

### 3. **Antes de Submeter**
```bash
# Execute linting
npm run lint

# Execute testes
npm test

# Verifique se o build funciona
npm run build
```

### 4. **Mensagens de Commit**
```bash
# ✅ Bom
git commit -m "feat: adicionar filtro por período na página de turmas"
git commit -m "fix: corrigir cálculo de valores a receber dos professores"
git commit -m "docs: atualizar documentação da API"

# ❌ Ruim
git commit -m "mudanças"
git commit -m "fix bug"
git commit -m "update"
```

### 5. **Template de PR**
```markdown
## Descrição
Breve descrição das mudanças implementadas.

## Tipo de Mudança
- [ ] Bug fix
- [ ] Nova feature
- [ ] Breaking change
- [ ] Documentação

## Como Testar
1. Passo 1
2. Passo 2
3. Resultado esperado

## Screenshots (se aplicável)
[Adicione screenshots das mudanças visuais]

## Checklist
- [ ] Código segue os padrões do projeto
- [ ] Testes foram adicionados/atualizados
- [ ] Documentação foi atualizada
- [ ] Build passa sem erros
```

## 🐛 Reportar Issues

### Template de Bug Report
```markdown
## Descrição do Bug
Descrição clara e concisa do problema.

## Passos para Reproduzir
1. Vá para '...'
2. Clique em '...'
3. Role até '...'
4. Veja o erro

## Comportamento Esperado
O que deveria acontecer.

## Comportamento Atual
O que está acontecendo.

## Screenshots
Se aplicável, adicione screenshots.

## Ambiente
- OS: [e.g. Windows 10]
- Browser: [e.g. Chrome 91]
- Versão: [e.g. 1.2.3]

## Informações Adicionais
Qualquer outra informação relevante.
```

### Template de Feature Request
```markdown
## Resumo da Feature
Descrição clara da feature solicitada.

## Problema que Resolve
Qual problema esta feature resolve?

## Solução Proposta
Como você imagina que esta feature funcionaria?

## Alternativas Consideradas
Outras soluções que você considerou?

## Informações Adicionais
Contexto adicional, screenshots, etc.
```

## 🎨 Guia de Design

### Cores
```css
/* Cores principais */
--color-dark: #1A1D21;
--color-dark-lighter: #22262B;
--color-dark-card: #2A2F35;
--color-teal-accent: #2CD3C7;

/* Cores de status */
--color-success: #10B981;
--color-warning: #F59E0B;
--color-error: #EF4444;
--color-info: #3B82F6;
```

### Espaçamento
```css
/* Sistema de espaçamento 8px */
.space-1 { margin: 0.25rem; }  /* 4px */
.space-2 { margin: 0.5rem; }   /* 8px */
.space-3 { margin: 0.75rem; }  /* 12px */
.space-4 { margin: 1rem; }     /* 16px */
.space-6 { margin: 1.5rem; }   /* 24px */
.space-8 { margin: 2rem; }     /* 32px */
```

### Tipografia
```css
/* Hierarquia de texto */
.text-xs { font-size: 0.75rem; }    /* 12px */
.text-sm { font-size: 0.875rem; }   /* 14px */
.text-base { font-size: 1rem; }     /* 16px */
.text-lg { font-size: 1.125rem; }   /* 18px */
.text-xl { font-size: 1.25rem; }    /* 20px */
.text-2xl { font-size: 1.5rem; }    /* 24px */
.text-3xl { font-size: 1.875rem; }  /* 30px */
```

## 🚀 Deploy e Release

### Processo de Release
1. **Preparação**
   - Atualize CHANGELOG.md
   - Bump version no package.json
   - Teste em ambiente de staging

2. **Release**
   - Crie tag de versão
   - Publique release notes
   - Deploy para produção

3. **Pós-Release**
   - Monitore logs de erro
   - Verifique métricas
   - Comunique mudanças

### Versionamento Semântico
```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes
MINOR: Novas features (backward compatible)
PATCH: Bug fixes (backward compatible)

Exemplo: 1.2.3 → 1.3.0 (nova feature)
```

## 📞 Comunicação

### Canais
- **Issues**: Para bugs e feature requests
- **Discussions**: Para perguntas e ideias
- **Email**: Para questões sensíveis

### Código de Conduta
- Seja respeitoso e inclusivo
- Foque no problema, não na pessoa
- Aceite feedback construtivo
- Ajude outros desenvolvedores

## 📚 Recursos Úteis

### Documentação
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

### Ferramentas
- [React DevTools](https://chrome.google.com/webstore/detail/react-developer-tools/)
- [Supabase Dashboard](https://app.supabase.com)
- [Figma](https://figma.com) para design
- [Postman](https://postman.com) para testes de API

---

Obrigado por contribuir para o Pepper Heads CRM! Sua ajuda é fundamental para tornar este projeto ainda melhor. 🚀