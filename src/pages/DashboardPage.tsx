import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { TrendingUp, Target, BarChart3, DollarSign, ArrowUpRight, AlertTriangle, Wallet, Trophy, Megaphone, Building2 } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { useUnidade } from '../contexts/UnidadeContext';

interface DashboardStats {
  totalTurmas: number;
  totalAlunos: number;
  interested: number;
  enrolled: number;
  completed: number;
  conversionRate: number;
  faturamentoRealizado: number;
  faturamentoPotencial: number;
  ocupacaoMedia: number;
  vagasOciosas: number;
  potencialOcioso: number;
  receitaRecebida: number;
  receitaPendente: number;
  receitaAtrasada: number;
  parcelasAtrasadas: number;
  custoProfessores: number;
  custoImpostos: number;
  investimentoAnunciosPrevisto: number;
  investimentoAnunciosRealizado: number;
  potencialCapacidade: number;
  capacidadeUnidades: { id: string; nome: string; totalCadeiras: number; horasDisponivelDia: number; valorHoraAluno: number; potencialMensal: number }[];
  topCursos: { id: string; nome: string; preco: number; interested: number; enrolled: number }[];
  topSellers: { id: string; email: string; nome: string; totalMatriculas: number; receitaGerada: number }[];
  turmasComVagas: { id: string; name: string; curso: string; sala: string; period: string; enrolled: number; cadeiras: number; start_date: string; end_date: string }[];
  recentActivity: { id: string; user_email: string; action: string; entity_type: string; entity_name: string; created_at: string }[];
}

const PERIOD_LABELS: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  dia_inteiro: 'Dia Inteiro',
};

export function DashboardPage() {
  const { selectedUnidadeId } = useUnidade();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [selectedUnidadeId]);

  async function loadStats() {
    try {
      const unidadeParam = selectedUnidadeId ? `?unidade_id=${selectedUnidadeId}` : '';
      const data = await api.get(`/api/dashboard/stats${unidadeParam}`);
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-accent border-t-transparent"></div>
      </div>
    );
  }

  if (!stats) return <div className="p-8 text-gray-400">Erro ao carregar dados</div>;

  const progressPercent = stats.faturamentoPotencial > 0
    ? (stats.faturamentoRealizado / stats.faturamentoPotencial) * 100
    : 0;

  // Margin calculation
  const custoTotal = stats.custoProfessores + stats.investimentoAnunciosRealizado + stats.custoImpostos;
  const margemProjetada = stats.faturamentoRealizado - custoTotal;

  return (
    <div className="p-8 fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-2">Visão executiva do desempenho da escola</p>
        </div>

        {/* Hero KPIs — 4 main cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Potencial por Capacidade */}
          <div className="bg-dark-card rounded-2xl p-6 hover:bg-dark-lighter/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">Potencial Capacidade</span>
              <div className="bg-purple-500 p-2 rounded-xl">
                <Building2 className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              {stats.potencialCapacidade > 0 ? formatCurrency(stats.potencialCapacidade) + '/mês' : 'Não configurado'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.potencialCapacidade > 0 
                ? `${stats.capacidadeUnidades.length} unidade${stats.capacidadeUnidades.length > 1 ? 's' : ''} · cadeiras × h/dia × 20 dias`
                : 'Configure horas e valor/hora nas unidades'
              }
            </p>
            {stats.potencialCapacidade > 0 && (
              <p className="text-xs text-gray-600 mt-1">
                Potencial por turmas: {formatCurrency(stats.faturamentoPotencial)}
              </p>
            )}
          </div>

          {/* Faturamento Realizado */}
          <div className="bg-dark-card rounded-2xl p-6 hover:bg-dark-lighter/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">Faturamento Realizado</span>
              <div className="bg-emerald-500 p-2 rounded-xl">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.faturamentoRealizado)}</p>
            <div className="mt-2">
              <div className="w-full bg-dark rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-accent h-2 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{progressPercent.toFixed(1)}% do potencial</p>
            </div>
          </div>

          {/* Potencial Ocioso */}
          <div className="bg-dark-card rounded-2xl p-6 hover:bg-dark-lighter/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">Potencial Ocioso</span>
              <div className="bg-amber-500 p-2 rounded-xl">
                <Target className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-400">{formatCurrency(stats.potencialOcioso)}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.vagasOciosas} vagas disponíveis para capturar</p>
          </div>

          {/* Ocupação Média */}
          <div className="bg-dark-card rounded-2xl p-6 hover:bg-dark-lighter/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">Ocupação Média</span>
              <div className="bg-blue-500 p-2 rounded-xl">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{stats.ocupacaoMedia}%</p>
            <div className="mt-2">
              <div className="w-full bg-dark rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-700 ${
                    stats.ocupacaoMedia >= 80 ? 'bg-emerald-500' :
                    stats.ocupacaoMedia >= 50 ? 'bg-blue-500' :
                    'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(stats.ocupacaoMedia, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.enrolled} alunos · {stats.capacidadeUnidades.reduce((s, u) => s + u.totalCadeiras, 0)} cadeiras totais
              </p>
            </div>
          </div>
        </div>

        {/* Revenue + Costs + Margin row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Painel de Receita */}
          <div className="bg-dark-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-400" />
              Receita (Pagamentos)
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm text-gray-400">Recebida</span>
                </div>
                <span className="text-lg font-bold text-emerald-400">{formatCurrency(stats.receitaRecebida)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-sm text-gray-400">A Receber</span>
                </div>
                <span className="text-lg font-bold text-amber-400">{formatCurrency(stats.receitaPendente)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm text-gray-400">Em Atraso</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-red-400">{formatCurrency(stats.receitaAtrasada)}</span>
                  {stats.parcelasAtrasadas > 0 && (
                    <p className="text-xs text-red-400/70">{stats.parcelasAtrasadas} parcela{stats.parcelasAtrasadas > 1 ? 's' : ''}</p>
                  )}
                </div>
              </div>
            </div>
            {stats.receitaAtrasada > 0 && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span className="text-xs text-red-400">Atenção: há cobranças em atraso que precisam de follow-up</span>
              </div>
            )}
          </div>

          {/* Painel de Custos */}
          <div className="bg-dark-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-red-400" />
              Custos
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Professores</span>
                <span className="text-sm font-medium text-red-400">-{formatCurrency(stats.custoProfessores)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Impostos (média)</span>
                <span className="text-sm font-medium text-red-400">-{formatCurrency(stats.custoImpostos)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-gray-400">Anúncios</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-500">Previsto: {formatCurrency(stats.investimentoAnunciosPrevisto)}</span>
                  </div>
                </div>
                <span className="text-sm font-medium text-red-400">-{formatCurrency(stats.investimentoAnunciosRealizado)}</span>
              </div>
              <div className="pt-3 border-t border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-white">Total Custos</span>
                  <span className="text-sm font-bold text-red-400">-{formatCurrency(custoTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Margem Projetada */}
          <div className="bg-dark-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-teal-accent" />
              Margem Projetada
            </h2>
            <div className="flex flex-col items-center justify-center flex-1 pt-2">
              <p className={`text-4xl font-bold ${margemProjetada >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(margemProjetada)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {stats.faturamentoRealizado > 0
                  ? `${((margemProjetada / stats.faturamentoRealizado) * 100).toFixed(1)}% de margem`
                  : 'Sem faturamento ainda'
                }
              </p>
              <div className="mt-4 w-full space-y-2 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Faturamento</span>
                  <span className="text-emerald-400">+{formatCurrency(stats.faturamentoRealizado)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Custos</span>
                  <span className="text-red-400">-{formatCurrency(custoTotal)}</span>
                </div>
              </div>
            </div>
            {margemProjetada < 0 && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span className="text-xs text-red-400">Custos excedem o faturamento!</span>
              </div>
            )}
          </div>
        </div>

        {/* Ads Investment + Funnel + Top Cursos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Investimento em Ads */}
          <div className="bg-dark-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-violet-400" />
              Investimento em Ads
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-400">Previsto</span>
                  <span className="text-sm font-medium text-gray-300">{formatCurrency(stats.investimentoAnunciosPrevisto)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Realizado</span>
                  <span className="text-sm font-medium text-violet-400">{formatCurrency(stats.investimentoAnunciosRealizado)}</span>
                </div>
                <div className="w-full bg-dark rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-700 ${
                      stats.investimentoAnunciosPrevisto > 0 && stats.investimentoAnunciosRealizado > stats.investimentoAnunciosPrevisto
                        ? 'bg-red-500' : 'bg-violet-500'
                    }`}
                    style={{
                      width: `${stats.investimentoAnunciosPrevisto > 0
                        ? Math.min((stats.investimentoAnunciosRealizado / stats.investimentoAnunciosPrevisto) * 100, 100)
                        : 0}%`
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.investimentoAnunciosPrevisto > 0
                    ? `${((stats.investimentoAnunciosRealizado / stats.investimentoAnunciosPrevisto) * 100).toFixed(0)}% do orçamento utilizado`
                    : 'Nenhum orçamento previsto'
                  }
                </p>
              </div>
              {stats.investimentoAnunciosPrevisto > 0 && stats.investimentoAnunciosRealizado > stats.investimentoAnunciosPrevisto && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <span className="text-xs text-red-400">Investimento excede o previsto em {formatCurrency(stats.investimentoAnunciosRealizado - stats.investimentoAnunciosPrevisto)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Top Cursos */}
          <div className="bg-dark-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-teal-accent" />
              Top Cursos por Demanda
            </h2>
            <div className="space-y-3">
              {stats.topCursos.map((curso) => {
                const total = curso.interested + curso.enrolled;
                const maxTotal = stats.topCursos[0] ? stats.topCursos[0].interested + stats.topCursos[0].enrolled : 1;
                const barWidth = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                return (
                  <div key={curso.id}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-white truncate flex-1">{curso.nome}</span>
                      <div className="flex items-center gap-3 ml-2">
                        <span className="text-xs text-amber-400">{curso.interested} int.</span>
                        <span className="text-xs text-emerald-400">{curso.enrolled} mat.</span>
                      </div>
                    </div>
                    <div className="w-full bg-dark rounded-full h-2">
                      <div className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-amber-500 to-emerald-500" style={{ width: `${barWidth}%` }} />
                    </div>
                  </div>
                );
              })}
              {stats.topCursos.length === 0 && (
                <p className="text-gray-500 text-center py-4">Nenhum curso com interesse</p>
              )}
            </div>
          </div>

          {/* Funil de Conversão */}
          <div className="bg-dark-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-400" />
              Funil de Conversão
            </h2>
            <div className="space-y-4">
              {[
                { label: 'Interessados', value: stats.interested, color: 'bg-amber-500', width: 100 },
                { label: 'Matriculados', value: stats.enrolled, color: 'bg-blue-500', width: stats.interested > 0 ? (stats.enrolled / stats.interested) * 100 : 0 },
                { label: 'Concluídos', value: stats.completed, color: 'bg-emerald-500', width: stats.interested > 0 ? (stats.completed / stats.interested) * 100 : 0 },
              ].map((stage, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-400">{stage.label}</span>
                    <span className="text-sm text-white font-medium">{stage.value}</span>
                  </div>
                  <div className="w-full bg-dark rounded-full h-3">
                    <div
                      className={`${stage.color} h-3 rounded-full transition-all duration-700`}
                      style={{ width: `${Math.max(stage.width, stage.value > 0 ? 5 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Sellers + Turmas com Vagas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Sellers */}
          <div className="bg-dark-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              Ranking de Vendedores
            </h2>
            <div className="space-y-3">
              {stats.topSellers.map((seller, i) => (
                <div key={seller.id} className="flex items-center gap-3 p-3 bg-dark-lighter rounded-xl">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-amber-500/20 text-amber-400' :
                    i === 1 ? 'bg-gray-400/20 text-gray-300' :
                    i === 2 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-dark text-gray-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{seller.nome}</p>
                    <p className="text-gray-500 text-xs">{seller.totalMatriculas} matrícula{seller.totalMatriculas > 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 text-sm font-bold">{formatCurrency(seller.receitaGerada)}</p>
                  </div>
                </div>
              ))}
              {stats.topSellers.length === 0 && (
                <p className="text-gray-500 text-center py-4">Nenhuma venda registrada ainda</p>
              )}
            </div>
          </div>

          {/* Turmas com vagas */}
          <div className="bg-dark-card rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-emerald-400" />
              Turmas com Vagas Disponíveis
            </h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {stats.turmasComVagas.map(turma => {
                const percentOcupado = (turma.enrolled / turma.cadeiras) * 100;
                return (
                  <div key={turma.id} className="bg-dark-lighter rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-white font-medium text-sm">{turma.name || turma.curso}</h3>
                        <p className="text-gray-500 text-xs">{turma.curso} · {turma.sala}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-dark text-gray-400">
                        {PERIOD_LABELS[turma.period] || turma.period}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Ocupação</span>
                      <span className="text-white">{turma.enrolled}/{turma.cadeiras}</span>
                    </div>
                    <div className="w-full bg-dark rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${percentOcupado >= 80 ? 'bg-amber-500' : 'bg-teal-accent'}`}
                        style={{ width: `${percentOcupado}%` }}
                      />
                    </div>
                    <p className="text-emerald-400 text-xs mt-2 font-medium">
                      {turma.cadeiras - turma.enrolled} vagas disponíveis
                    </p>
                  </div>
                );
              })}
              {stats.turmasComVagas.length === 0 && (
                <p className="text-gray-500 text-center py-4">Todas as turmas estão lotadas 🎉</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
