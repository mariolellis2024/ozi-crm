import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Users, GraduationCap, BookOpen, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../utils/format';

interface DashboardProps {
  user: any;
}

interface Turma {
  id: string;
  curso_id: string;
  cadeiras: number;
  potencial_faturamento: number;
}

interface Curso {
  id: string;
  nome: string;
  preco: number;
}

interface Professor {
  id: string;
  nome: string;
}

interface Aluno {
  id: string;
  nome: string;
}

export function Dashboard({ user }: DashboardProps) {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [turmasData, cursosData, professoresData, alunosData] = await Promise.all([
        api.get('/api/turmas'),
        api.get('/api/cursos'),
        api.get('/api/professores'),
        api.get('/api/alunos')
      ]);
      setTurmas(turmasData);
      setCursos(cursosData);
      setProfessores(professoresData);
      setAlunos(Array.isArray(alunosData) ? alunosData : alunosData.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  const totalFaturamento = turmas.reduce((acc, turma) => acc + turma.potencial_faturamento, 0);
  const vagasOcupadas = 0;
  const ocupacaoMedia = 0;

  const stats = [
    { label: 'Total de Turmas', value: turmas.length, icon: Users, color: 'bg-purple-500' },
    { label: 'Professores', value: professores.length, icon: GraduationCap, color: 'bg-blue-500' },
    { label: 'Cursos', value: cursos.length, icon: BookOpen, color: 'bg-green-500' },
    { label: 'Faturamento Potencial', value: formatCurrency(totalFaturamento), icon: TrendingUp, color: 'bg-teal-accent' }
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Bem-vindo, {user?.email?.split('@')[0]}
          </h1>
          <p className="text-gray-400 mt-2">Confira o resumo das suas turmas e atividades</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-dark-card rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-xl`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-dark-card rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Ocupação das Turmas</h2>
            <span className="text-teal-accent font-semibold">
              {ocupacaoMedia.toFixed(1)}% ocupação média
            </span>
          </div>
          <div className="space-y-4">
            {turmas.map((turma) => {
              const curso = cursos.find(c => c.id === turma.curso_id);
              return (
                <div key={turma.id} className="bg-dark-lighter rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-white">{curso?.nome}</h3>
                    <span className="text-gray-400 text-sm">0/{turma.cadeiras} vagas</span>
                  </div>
                  <div className="w-full bg-dark rounded-full h-2">
                    <div className="bg-teal-accent h-2 rounded-full transition-all duration-300" style={{ width: '0%' }} />
                  </div>
                </div>
              );
            })}
            {turmas.length === 0 && (
              <div className="text-center text-gray-400 py-4">Nenhuma turma cadastrada</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-dark-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Últimos Alunos</h2>
            <div className="space-y-4">
              {alunos.slice(0, 5).map((aluno) => (
                <div key={aluno.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-dark-lighter flex items-center justify-center">
                      <span className="text-white text-sm">{aluno.nome.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="ml-3 text-white">{aluno.nome}</span>
                  </div>
                </div>
              ))}
              {alunos.length === 0 && (
                <div className="text-center text-gray-400 py-4">Nenhum aluno cadastrado</div>
              )}
            </div>
          </div>

          <div className="bg-dark-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Professores Ativos</h2>
            <div className="space-y-4">
              {professores.slice(0, 5).map((professor) => (
                <div key={professor.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-dark-lighter flex items-center justify-center">
                      <GraduationCap className="h-4 w-4 text-white" />
                    </div>
                    <span className="ml-3 text-white">{professor.nome}</span>
                  </div>
                </div>
              ))}
              {professores.length === 0 && (
                <div className="text-center text-gray-400 py-4">Nenhum professor cadastrado</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}