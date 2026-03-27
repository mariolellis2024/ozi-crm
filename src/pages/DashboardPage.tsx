import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Users, TrendingUp, Target, BarChart3, DollarSign, ArrowUpRight, Megaphone } from 'lucide-react';
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
  topCursos: { id: string; nome: string; preco: number; interested: number; enrolled: number }[];
  turmasComVagas: { id: string; name: string; curso: string; sala: string; period: string; enrolled: number; cadeiras: number; start_date: string; end_date: string }[];
  recentActivity: { id: string; user_email: string; action: string; entity_type: string; entity_name: string; created_at: string }[];
}

interface CampaignStats {
  campaign: string;
  source: string;
  medium: string;
  totalLeads: number;
  enrolled: number;
  completed: number;
  receita: number;
  conversionRate: string;
}

const PERIOD_LABELS: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};

export function DashboardPage() {
  const { selectedUnidadeId } = useUnidade();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [selectedUnidadeId]);

  async function loadStats() {
    try {
      const unidadeParam = selectedUnidadeId ? `?unidade_id=${selectedUnidadeId}` : '';
      const [data, campaignData] = await Promise.all([
        api.get(`/api/dashboard/stats${unidadeParam}`),
        api.get(`/api/dashboard/campaigns${unidadeParam}`)
      ]);
      setStats(data);
      setCampaigns(campaignData);
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

  const kpis = [
    {
      label: 'Faturamento Realizado',
      value: formatCurrency(stats.faturamentoRealizado),
      subtitle: `de ${formatCurrency(stats.faturamentoPotencial)} potencial`,
      icon: DollarSign,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-400',
    },
    {
      label: 'Taxa de Conversão',
      value: `${stats.conversionRate}%`,
      subtitle: `${stats.enrolled} de ${stats.enrolled + stats.interested} convertidos`,
      icon: Target,
      color: 'bg-blue-500',
      textColor: 'text-blue-400',
    },
    {
      label: 'Ocupação Média',
      value: `${stats.ocupacaoMedia}%`,
      subtitle: `${stats.enrolled} alunos em ${stats.totalTurmas} turmas`,
      icon: BarChart3,
      color: 'bg-purple-500',
      textColor: 'text-purple-400',
    },
    {
      label: 'Total de Alunos',
      value: stats.totalAlunos,
      subtitle: `${stats.interested} interessados · ${stats.enrolled} matriculados`,
      icon: Users,
      color: 'bg-teal-accent',
      textColor: 'text-teal-accent',
    },
  ];

  return (
    <div className="p-8 fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-2">Visão geral do desempenho do CRM</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-dark-card rounded-2xl p-6 hover:bg-dark-lighter/50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">{kpi.label}</span>
                <div className={`${kpi.color} p-2 rounded-xl`}>
                  <kpi.icon className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
              <p className="text-xs text-gray-500 mt-1">{kpi.subtitle}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
                        <span className="text-xs text-amber-400">{curso.interested} interessados</span>
                        <span className="text-xs text-emerald-400">{curso.enrolled} matriculados</span>
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

          {/* Funnel */}
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

        {/* Turmas com vagas */}
        <div className="bg-dark-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-emerald-400" />
            Turmas com Vagas Disponíveis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <p className="text-gray-500 text-center py-4 col-span-3">Todas as turmas estão lotadas 🎉</p>
            )}
          </div>
        </div>

        {/* Campaign Attribution */}
        {campaigns.length > 0 && (
          <div className="bg-dark-card rounded-2xl p-6 mt-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-orange-400" />
              Atribuição por Campanha
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-left">
                    <th className="pb-3 font-medium">Campanha</th>
                    <th className="pb-3 font-medium">Fonte</th>
                    <th className="pb-3 font-medium text-center">Leads</th>
                    <th className="pb-3 font-medium text-center">Matrículas</th>
                    <th className="pb-3 font-medium text-center">Conversão</th>
                    <th className="pb-3 font-medium text-right">Receita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {campaigns.map((c, i) => (
                    <tr key={i} className="hover:bg-dark-lighter/30 transition-colors">
                      <td className="py-3">
                        <span className="text-white font-medium">{c.campaign}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-gray-400">{c.source}</span>
                        {c.medium !== '-' && (
                          <span className="text-gray-500 ml-1">/ {c.medium}</span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        <span className="text-amber-400 font-medium">{c.totalLeads}</span>
                      </td>
                      <td className="py-3 text-center">
                        <span className="text-emerald-400 font-medium">{c.enrolled}</span>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`font-medium ${parseFloat(c.conversionRate) > 20 ? 'text-emerald-400' : parseFloat(c.conversionRate) > 10 ? 'text-amber-400' : 'text-gray-400'}`}>
                          {c.conversionRate}%
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span className="text-white font-medium">{formatCurrency(c.receita)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
