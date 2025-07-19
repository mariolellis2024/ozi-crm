import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Dados fictícios dos alunos
const fictionalStudents = [
  {
    nome: 'Ana Silva',
    email: 'ana.silva@email.com',
    whatsapp: '(11) 99999-0001',
    empresa: 'Tech Solutions',
    available_periods: ['manha', 'tarde']
  },
  {
    nome: 'Carlos Santos',
    email: 'carlos.santos@email.com',
    whatsapp: '(11) 99999-0002',
    empresa: 'Digital Corp',
    available_periods: ['noite']
  },
  {
    nome: 'Maria Oliveira',
    email: 'maria.oliveira@email.com',
    whatsapp: '(11) 99999-0003',
    empresa: 'StartUp Inc',
    available_periods: ['manha']
  },
  {
    nome: 'João Pereira',
    email: 'joao.pereira@email.com',
    whatsapp: '(11) 99999-0004',
    empresa: 'Innovation Labs',
    available_periods: ['tarde', 'noite']
  },
  {
    nome: 'Fernanda Costa',
    email: 'fernanda.costa@email.com',
    whatsapp: '(11) 99999-0005',
    empresa: 'Future Tech',
    available_periods: [] // Disponível em qualquer horário
  },
  {
    nome: 'Ricardo Lima',
    email: 'ricardo.lima@email.com',
    whatsapp: '(11) 99999-0006',
    empresa: 'Code Masters',
    available_periods: ['manha', 'tarde', 'noite']
  },
  {
    nome: 'Juliana Rocha',
    email: 'juliana.rocha@email.com',
    whatsapp: '(11) 99999-0007',
    empresa: 'Data Science Co',
    available_periods: ['tarde']
  },
  {
    nome: 'Pedro Almeida',
    email: 'pedro.almeida@email.com',
    whatsapp: '(11) 99999-0008',
    empresa: 'AI Solutions',
    available_periods: ['noite']
  },
  {
    nome: 'Camila Ferreira',
    email: 'camila.ferreira@email.com',
    whatsapp: '(11) 99999-0009',
    empresa: 'Cloud Systems',
    available_periods: ['manha']
  },
  {
    nome: 'Bruno Martins',
    email: 'bruno.martins@email.com',
    whatsapp: '(11) 99999-0010',
    empresa: 'DevOps Pro',
    available_periods: ['tarde', 'noite']
  }
];

async function createFictionalStudents() {
  try {
    console.log('🚀 Iniciando criação de alunos fictícios...');

    // 1. Buscar cursos existentes
    const { data: cursos, error: cursosError } = await supabase
      .from('cursos')
      .select('id, nome');

    if (cursosError) throw cursosError;

    if (cursos.length === 0) {
      console.log('❌ Nenhum curso encontrado. Crie cursos primeiro.');
      return;
    }

    console.log(`📚 Encontrados ${cursos.length} cursos:`, cursos.map(c => c.nome));

    // 2. Inserir alunos
    const { data: alunosInseridos, error: alunosError } = await supabase
      .from('alunos')
      .insert(fictionalStudents)
      .select();

    if (alunosError) throw alunosError;

    console.log(`👥 ${alunosInseridos.length} alunos criados com sucesso!`);

    // 3. Criar interesses aleatórios
    const interesses = [];
    
    for (const aluno of alunosInseridos) {
      // Cada aluno terá interesse em 1-3 cursos aleatórios
      const numInteresses = Math.floor(Math.random() * 3) + 1;
      const cursosEscolhidos = [...cursos]
        .sort(() => 0.5 - Math.random())
        .slice(0, numInteresses);

      for (const curso of cursosEscolhidos) {
        interesses.push({
          aluno_id: aluno.id,
          curso_id: curso.id,
          status: 'interested'
        });
      }
    }

    // 4. Inserir interesses
    const { error: interessesError } = await supabase
      .from('aluno_curso_interests')
      .insert(interesses);

    if (interessesError) throw interessesError;

    console.log(`💡 ${interesses.length} interesses criados!`);

    // 5. Mostrar resumo
    console.log('\n📊 RESUMO:');
    console.log(`✅ ${alunosInseridos.length} alunos criados`);
    console.log(`✅ ${interesses.length} interesses em cursos`);
    
    // Agrupar por curso
    const interessesPorCurso = {};
    for (const interesse of interesses) {
      const curso = cursos.find(c => c.id === interesse.curso_id);
      if (!interessesPorCurso[curso.nome]) {
        interessesPorCurso[curso.nome] = 0;
      }
      interessesPorCurso[curso.nome]++;
    }

    console.log('\n📈 Interesses por curso:');
    Object.entries(interessesPorCurso).forEach(([curso, count]) => {
      console.log(`   ${curso}: ${count} interessados`);
    });

    console.log('\n🎉 Dados fictícios criados com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao criar dados fictícios:', error);
  }
}

// Executar o script
createFictionalStudents();