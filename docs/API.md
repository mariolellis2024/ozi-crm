# Documentação da API - Pepper Heads CRM

## 🔗 Visão Geral da API

O Pepper Heads CRM utiliza **Supabase** como Backend-as-a-Service, fornecendo uma API REST automática baseada no esquema do banco PostgreSQL, além de recursos real-time via WebSockets.

## 🏗️ Arquitetura da API

```
Client (React) ←→ Supabase Client ←→ PostgREST API ←→ PostgreSQL
                       ↓
                 Real-time Engine
                       ↓
                 WebSocket Connection
```

## 🔐 Autenticação

### Configuração do Cliente
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);
```

### Métodos de Autenticação

#### Login
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});
```

#### Registro
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});
```

#### Logout
```typescript
const { error } = await supabase.auth.signOut();
```

#### Verificar Sessão
```typescript
const { data: { session } } = await supabase.auth.getSession();
```

## 📊 Endpoints das Entidades

### 👥 Alunos

#### Listar Alunos
```typescript
const { data, error } = await supabase
  .from('alunos')
  .select(`
    *,
    curso_interests:aluno_curso_interests(
      id,
      curso_id,
      status,
      curso:cursos(nome, preco)
    )
  `)
  .order('created_at', { ascending: false });
```

#### Criar Aluno
```typescript
const { data, error } = await supabase
  .from('alunos')
  .insert([{
    nome: 'João Silva',
    email: 'joao@email.com',
    whatsapp: '11999999999',
    empresa: 'Tech Corp',
    available_periods: ['manha', 'tarde']
  }])
  .select();
```

#### Atualizar Aluno
```typescript
const { data, error } = await supabase
  .from('alunos')
  .update({
    nome: 'João Santos',
    empresa: 'New Tech Corp'
  })
  .eq('id', alunoId)
  .select();
```

#### Deletar Aluno
```typescript
const { error } = await supabase
  .from('alunos')
  .delete()
  .eq('id', alunoId);
```

### 🎓 Professores

#### Listar Professores com Cálculos Financeiros
```typescript
const { data: professores } = await supabase
  .from('professores')
  .select('*')
  .order('created_at', { ascending: false });

const { data: turmasProfessores } = await supabase
  .from('turma_professores')
  .select(`
    professor_id,
    hours,
    turma:turmas(
      id,
      start_date,
      end_date
    )
  `);

// Cálculo de valores a receber/recebidos
const professoresComValores = professores.map(professor => {
  const professorTurmas = turmasProfessores.filter(
    tp => tp.professor_id === professor.id
  );
  
  let totalAReceber = 0;
  let totalRecebido = 0;
  const hoje = new Date();
  
  professorTurmas.forEach(tp => {
    const earnings = tp.hours * professor.valor_hora;
    const endDate = new Date(tp.turma.end_date);
    
    if (endDate <= hoje) {
      totalRecebido += earnings;
    } else {
      totalAReceber += earnings;
    }
  });
  
  return {
    ...professor,
    total_a_receber: totalAReceber,
    total_recebido: totalRecebido
  };
});
```

#### Criar Professor
```typescript
const { data, error } = await supabase
  .from('professores')
  .insert([{
    nome: 'Maria Santos',
    email: 'maria@email.com',
    whatsapp: '11888888888',
    valor_hora: 150.00
  }])
  .select();
```

### 📚 Cursos

#### Listar Cursos com Categorias e Interesse
```typescript
const { data: cursos } = await supabase
  .from('cursos')
  .select(`
    *,
    categoria:categorias(nome)
  `)
  .order('created_at', { ascending: false });

const { data: interests } = await supabase
  .from('aluno_curso_interests')
  .select('curso_id, status');

// Adicionar contagem de interessados
const cursosComInteresse = cursos.map(curso => ({
  ...curso,
  interested_students_count: interests.filter(
    i => i.curso_id === curso.id && i.status === 'interested'
  ).length
}));
```

#### Criar Curso
```typescript
const { data, error } = await supabase
  .from('cursos')
  .insert([{
    nome: 'React Avançado',
    carga_horaria: 40,
    preco: 2500.00,
    categoria_id: 'uuid-categoria'
  }])
  .select();
```

### 🏫 Turmas

#### Listar Turmas Completas
```typescript
const { data, error } = await supabase
  .from('turmas')
  .select(`
    *,
    curso:cursos(*),
    sala:salas(*),
    professores:turma_professores(
      id,
      hours,
      professor:professores(id, nome, valor_hora)
    )
  `)
  .order('created_at', { ascending: false });
```

#### Criar Turma com Validação de Conflitos
```typescript
// 1. Verificar conflitos de sala
const { data: conflitos } = await supabase
  .from('turmas')
  .select('id, name, start_date, end_date')
  .eq('sala_id', salaId)
  .eq('period', period);

// 2. Validar sobreposição de datas
const hasConflict = conflitos.some(turma => {
  const existingStart = new Date(turma.start_date);
  const existingEnd = new Date(turma.end_date);
  const newStart = new Date(startDate);
  const newEnd = new Date(endDate);
  
  return (newStart <= existingEnd && newEnd >= existingStart);
});

if (!hasConflict) {
  // 3. Criar turma
  const { data: turma } = await supabase
    .from('turmas')
    .insert([turmaData])
    .select()
    .single();
    
  // 4. Adicionar professores
  const assignments = professores.map(prof => ({
    turma_id: turma.id,
    professor_id: prof.professor_id,
    hours: prof.hours
  }));
  
  await supabase
    .from('turma_professores')
    .insert(assignments);
}
```

### 🏢 Salas

#### Listar Salas
```typescript
const { data, error } = await supabase
  .from('salas')
  .select('*')
  .order('nome');
```

#### Verificar Uso da Sala
```typescript
const { data: turmasUsandoSala } = await supabase
  .from('turmas')
  .select('id')
  .eq('sala_id', salaId)
  .limit(1);

const salaEmUso = turmasUsandoSala.length > 0;
```

### 🏷️ Categorias

#### CRUD Completo de Categorias
```typescript
// Listar
const { data } = await supabase
  .from('categorias')
  .select('*')
  .order('nome');

// Criar
const { data, error } = await supabase
  .from('categorias')
  .insert([{ nome: 'Programação' }])
  .select();

// Atualizar
const { data, error } = await supabase
  .from('categorias')
  .update({ nome: 'Desenvolvimento' })
  .eq('id', categoriaId)
  .select();

// Deletar (com verificação)
const { data: cursosUsandoCategoria } = await supabase
  .from('cursos')
  .select('id')
  .eq('categoria_id', categoriaId)
  .limit(1);

if (cursosUsandoCategoria.length === 0) {
  await supabase
    .from('categorias')
    .delete()
    .eq('id', categoriaId);
}
```

### 💡 Interesses de Alunos

#### Gerenciar Status de Interesse
```typescript
// Criar interesse
const { error } = await supabase
  .from('aluno_curso_interests')
  .insert([{
    aluno_id: alunoId,
    curso_id: cursoId,
    status: 'interested'
  }]);

// Atualizar status (interessado → matriculado)
const { error } = await supabase
  .from('aluno_curso_interests')
  .update({ 
    status: 'enrolled',
    turma_id: turmaId
  })
  .eq('aluno_id', alunoId)
  .eq('curso_id', cursoId);

// Marcar como concluído
const { error } = await supabase
  .from('aluno_curso_interests')
  .update({ status: 'completed' })
  .eq('aluno_id', alunoId)
  .eq('curso_id', cursoId)
  .eq('turma_id', turmaId);

// Remover interesse
const { error } = await supabase
  .from('aluno_curso_interests')
  .delete()
  .eq('aluno_id', alunoId)
  .eq('curso_id', cursoId);
```

## 🔄 Real-time Subscriptions

### Escutar Mudanças em Tempo Real

#### Alunos
```typescript
const subscription = supabase
  .channel('alunos-changes')
  .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'alunos' },
      (payload) => {
        console.log('Mudança em alunos:', payload);
        loadAlunos(); // Recarregar dados
      }
  )
  .subscribe();

// Cleanup
return () => subscription.unsubscribe();
```

#### Turmas
```typescript
const subscription = supabase
  .channel('turmas-changes')
  .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'turmas' },
      (payload) => {
        console.log('Nova turma criada:', payload.new);
      }
  )
  .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'turmas' },
      (payload) => {
        console.log('Turma atualizada:', payload.new);
      }
  )
  .subscribe();
```

## 📊 Queries Complexas

### Relatório de Faturamento
```typescript
const { data: relatorioFaturamento } = await supabase
  .from('turmas')
  .select(`
    id,
    name,
    cadeiras,
    start_date,
    end_date,
    curso:cursos(nome, preco),
    alunos_matriculados:aluno_curso_interests!inner(
      aluno:alunos(nome),
      status
    ),
    professores:turma_professores(
      hours,
      professor:professores(nome, valor_hora)
    )
  `)
  .eq('aluno_curso_interests.status', 'enrolled');

// Calcular métricas
const metricas = relatorioFaturamento.map(turma => {
  const faturamentoBruto = turma.alunos_matriculados.length * turma.curso.preco;
  const custoProfessores = turma.professores.reduce((total, tp) => 
    total + (tp.hours * tp.professor.valor_hora), 0
  );
  const lucroLiquido = faturamentoBruto - custoProfessores;
  
  return {
    turma: turma.name,
    faturamentoBruto,
    custoProfessores,
    lucroLiquido,
    margemLucro: (lucroLiquido / faturamentoBruto) * 100
  };
});
```

### Sugestões de Turmas
```typescript
const { data: interessesAlunos } = await supabase
  .from('aluno_curso_interests')
  .select(`
    curso_id,
    status,
    aluno:alunos(available_periods)
  `)
  .eq('status', 'interested');

// Agrupar por curso e período
const sugestoes = interessesAlunos.reduce((acc, interesse) => {
  const cursoId = interesse.curso_id;
  const periodos = interesse.aluno.available_periods || ['manha', 'tarde', 'noite'];
  
  if (!acc[cursoId]) {
    acc[cursoId] = { manha: 0, tarde: 0, noite: 0 };
  }
  
  periodos.forEach(periodo => {
    acc[cursoId][periodo]++;
  });
  
  return acc;
}, {});

// Filtrar cursos com demanda suficiente (>= 5 interessados)
const cursosComDemanda = Object.entries(sugestoes)
  .filter(([cursoId, demanda]) => 
    Math.max(...Object.values(demanda)) >= 5
  )
  .map(([cursoId, demanda]) => ({
    cursoId,
    melhorPeriodo: Object.entries(demanda)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0],
    totalInteressados: Math.max(...Object.values(demanda))
  }));
```

## ⚠️ Tratamento de Erros

### Padrão de Error Handling
```typescript
async function handleSupabaseOperation<T>(
  operation: () => Promise<{ data: T; error: any }>
): Promise<T> {
  try {
    const { data, error } = await operation();
    
    if (error) {
      // Log do erro
      console.error('Supabase error:', error);
      
      // Tratamento específico por tipo de erro
      if (error.code === '23505') { // Unique violation
        throw new Error('Registro já existe');
      } else if (error.code === '23503') { // Foreign key violation
        throw new Error('Referência inválida');
      } else {
        throw new Error(error.message || 'Erro desconhecido');
      }
    }
    
    return data;
  } catch (error) {
    // Re-throw para ser tratado no componente
    throw error;
  }
}

// Uso
try {
  const aluno = await handleSupabaseOperation(() =>
    supabase.from('alunos').insert(alunoData).select().single()
  );
  toast.success('Aluno criado com sucesso!');
} catch (error) {
  toast.error(error.message);
}
```

## 🔒 Políticas de Segurança (RLS)

### Exemplos de Políticas

#### Acesso Total para Usuários Autenticados
```sql
CREATE POLICY "Authenticated users can manage alunos"
ON alunos FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
```

#### Acesso Baseado em Propriedade
```sql
CREATE POLICY "Users can only see their own data"
ON user_profiles FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

## 📈 Performance e Otimização

### Índices Recomendados
```sql
-- Índices para queries frequentes
CREATE INDEX idx_alunos_email ON alunos(email);
CREATE INDEX idx_turmas_curso_id ON turmas(curso_id);
CREATE INDEX idx_turmas_sala_id ON turmas(sala_id);
CREATE INDEX idx_aluno_curso_interests_aluno_id ON aluno_curso_interests(aluno_id);
CREATE INDEX idx_aluno_curso_interests_curso_id ON aluno_curso_interests(curso_id);
```

### Paginação
```typescript
const ITEMS_PER_PAGE = 20;

const { data, error } = await supabase
  .from('alunos')
  .select('*')
  .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1)
  .order('created_at', { ascending: false });
```

### Cache de Queries
```typescript
const queryCache = new Map();

async function getCachedData(key: string, fetcher: () => Promise<any>) {
  if (queryCache.has(key)) {
    return queryCache.get(key);
  }
  
  const data = await fetcher();
  queryCache.set(key, data);
  
  // Limpar cache após 5 minutos
  setTimeout(() => queryCache.delete(key), 5 * 60 * 1000);
  
  return data;
}
```

---

Esta documentação cobre todos os aspectos da API do Pepper Heads CRM, fornecendo exemplos práticos e padrões recomendados para desenvolvimento eficiente.