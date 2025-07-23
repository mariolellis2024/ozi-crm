import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Activity, Clock, Database, TrendingUp, AlertTriangle } from 'lucide-react';
import { performanceMonitor } from '../utils/performance';

interface PerformanceDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PerformanceDashboard({ isOpen, onClose }: PerformanceDashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [metrics, setMetrics] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      updateStats();
      const interval = setInterval(updateStats, 2000); // Atualizar a cada 2 segundos
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  function updateStats() {
    const currentStats = performanceMonitor.getStats();
    const currentMetrics = performanceMonitor.getMetrics();
    setStats(currentStats);
    setMetrics(currentMetrics.slice(-20)); // Últimas 20 consultas
  }

  function clearData() {
    performanceMonitor.clearMetrics();
    setStats(null);
    setMetrics([]);
  }

  function getQueryTypeIcon(queryName: string) {
    if (queryName.includes('load')) return <Database className="h-4 w-4" />;
    if (queryName.includes('create') || queryName.includes('insert')) return <TrendingUp className="h-4 w-4" />;
    if (queryName.includes('update')) return <Activity className="h-4 w-4" />;
    if (queryName.includes('delete')) return <AlertTriangle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  }

  function getPerformanceColor(duration: number) {
    if (duration < 100) return 'text-green-400';
    if (duration < 500) return 'text-yellow-400';
    if (duration < 1000) return 'text-orange-400';
    return 'text-red-400';
  }

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-dark-card rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-teal-accent" />
            <div>
              <h2 className="text-xl font-semibold text-white">Performance Dashboard</h2>
              <p className="text-gray-400 text-sm">Monitoramento de consultas do banco de dados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearData}
              className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
            >
              Limpar Dados
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {stats ? (
          <>
            {/* Estatísticas Gerais */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-dark-lighter rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-blue-400" />
                  <span className="text-blue-400 font-medium text-sm">Total de Consultas</span>
                </div>
                <span className="text-white text-xl font-bold">{stats.totalQueries}</span>
              </div>

              <div className="bg-dark-lighter rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 font-medium text-sm">Tempo Médio</span>
                </div>
                <span className="text-white text-xl font-bold">{stats.avgDuration}ms</span>
              </div>

              <div className="bg-dark-lighter rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-400 font-medium text-sm">Mais Lenta</span>
                </div>
                <span className="text-white text-xl font-bold">{stats.maxDuration}ms</span>
              </div>

              <div className="bg-dark-lighter rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="text-red-400 font-medium text-sm">Consultas Lentas</span>
                </div>
                <span className="text-white text-xl font-bold">{stats.slowQueries}</span>
              </div>
            </div>

            {/* Consultas Lentas */}
            {stats.slowQueriesList.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  Consultas Lentas (>1s)
                </h3>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="space-y-2">
                    {stats.slowQueriesList.map((query: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-red-400 font-medium">{query.name}</span>
                        <span className="text-red-300">{query.duration?.toFixed(2)}ms</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Histórico de Consultas */}
            <div className="flex-1 overflow-hidden">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-teal-accent" />
                Histórico de Consultas (Últimas 20)
              </h3>
              <div className="bg-dark-lighter rounded-lg p-4 h-full overflow-y-auto">
                <div className="space-y-2">
                  {metrics.map((metric, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-2 bg-dark rounded-lg hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-gray-400">
                          {getQueryTypeIcon(metric.queryName)}
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm">
                            {metric.queryName}
                          </div>
                          {metric.recordCount !== undefined && (
                            <div className="text-gray-400 text-xs">
                              {metric.recordCount} registro{metric.recordCount !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${getPerformanceColor(metric.duration!)}`}>
                          {metric.duration?.toFixed(2)}ms
                        </div>
                        <div className="text-gray-400 text-xs">
                          {new Date(metric.startTime).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  {metrics.length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                      <p>Nenhuma consulta registrada ainda</p>
                      <p className="text-sm mt-1">Use o sistema para ver as métricas aparecerem aqui</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Activity className="h-12 w-12 mx-auto mb-4 text-gray-500" />
              <p className="text-lg">Nenhum dado de performance disponível</p>
              <p className="text-sm mt-2">Use o sistema para começar a coletar métricas</p>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}