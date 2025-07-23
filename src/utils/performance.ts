/**
 * Utilitários para monitoramento de performance das consultas Supabase
 * 
 * Este arquivo fornece ferramentas para medir e otimizar a performance
 * das consultas do banco de dados.
 */

interface QueryMetrics {
  queryName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  recordCount?: number;
  error?: string;
}

class PerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private isEnabled: boolean;

  constructor() {
    // Habilitar apenas em desenvolvimento
    this.isEnabled = import.meta.env.DEV;
  }

  /**
   * Inicia o monitoramento de uma consulta
   */
  startQuery(queryName: string): string {
    if (!this.isEnabled) return '';
    
    const queryId = `${queryName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.metrics.push({
      queryName,
      startTime: performance.now()
    });

    console.log(`🔍 [QUERY START] ${queryName}`);
    return queryId;
  }

  /**
   * Finaliza o monitoramento de uma consulta
   */
  endQuery(queryName: string, recordCount?: number, error?: string): void {
    if (!this.isEnabled) return;

    const metric = this.metrics.find(m => 
      m.queryName === queryName && !m.endTime
    );

    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.recordCount = recordCount;
      metric.error = error;

      const status = error ? '❌ ERROR' : '✅ SUCCESS';
      const duration = metric.duration.toFixed(2);
      const records = recordCount ? ` | ${recordCount} records` : '';
      
      console.log(`${status} [QUERY END] ${queryName} | ${duration}ms${records}`);
      
      if (error) {
        console.error(`Query error: ${error}`);
      }

      // Alertar sobre consultas lentas (> 1 segundo)
      if (metric.duration > 1000) {
        console.warn(`⚠️ SLOW QUERY: ${queryName} took ${duration}ms`);
      }
    }
  }

  /**
   * Obtém métricas de performance
   */
  getMetrics(): QueryMetrics[] {
    return this.metrics.filter(m => m.endTime);
  }

  /**
   * Obtém estatísticas resumidas
   */
  getStats() {
    const completedMetrics = this.getMetrics();
    
    if (completedMetrics.length === 0) {
      return null;
    }

    const durations = completedMetrics.map(m => m.duration!);
    const totalQueries = completedMetrics.length;
    const avgDuration = durations.reduce((a, b) => a + b, 0) / totalQueries;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    const slowQueries = completedMetrics.filter(m => m.duration! > 1000);

    return {
      totalQueries,
      avgDuration: Number(avgDuration.toFixed(2)),
      maxDuration: Number(maxDuration.toFixed(2)),
      minDuration: Number(minDuration.toFixed(2)),
      slowQueries: slowQueries.length,
      slowQueriesList: slowQueries.map(q => ({
        name: q.queryName,
        duration: q.duration
      }))
    };
  }

  /**
   * Limpa as métricas
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Exibe relatório de performance no console
   */
  printReport(): void {
    if (!this.isEnabled) return;

    const stats = this.getStats();
    if (!stats) {
      console.log('📊 No performance data available');
      return;
    }

    console.group('📊 PERFORMANCE REPORT');
    console.log(`Total Queries: ${stats.totalQueries}`);
    console.log(`Average Duration: ${stats.avgDuration}ms`);
    console.log(`Min Duration: ${stats.minDuration}ms`);
    console.log(`Max Duration: ${stats.maxDuration}ms`);
    console.log(`Slow Queries (>1s): ${stats.slowQueries}`);
    
    if (stats.slowQueriesList.length > 0) {
      console.group('🐌 Slow Queries Details:');
      stats.slowQueriesList.forEach(q => {
        console.log(`- ${q.name}: ${q.duration?.toFixed(2)}ms`);
      });
      console.groupEnd();
    }
    console.groupEnd();
  }
}

// Instância global do monitor
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator para monitorar automaticamente funções de consulta
 */
export function monitorQuery(queryName: string) {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!;

    descriptor.value = async function (...args: any[]) {
      performanceMonitor.startQuery(queryName);
      
      try {
        const result = await method.apply(this, args);
        const recordCount = Array.isArray(result?.data) ? result.data.length : undefined;
        performanceMonitor.endQuery(queryName, recordCount);
        return result;
      } catch (error) {
        performanceMonitor.endQuery(queryName, undefined, error.message);
        throw error;
      }
    } as T;

    return descriptor;
  };
}

/**
 * Hook para monitorar consultas em componentes React
 */
export function useQueryMonitor() {
  const startQuery = (queryName: string) => {
    return performanceMonitor.startQuery(queryName);
  };

  const endQuery = (queryName: string, recordCount?: number, error?: string) => {
    performanceMonitor.endQuery(queryName, recordCount, error);
  };

  const getStats = () => {
    return performanceMonitor.getStats();
  };

  const printReport = () => {
    performanceMonitor.printReport();
  };

  return {
    startQuery,
    endQuery,
    getStats,
    printReport
  };
}

/**
 * Wrapper para consultas Supabase com monitoramento automático
 */
export async function monitoredQuery<T>(
  queryName: string,
  queryFn: () => Promise<{ data: T; error: any }>
): Promise<{ data: T; error: any }> {
  performanceMonitor.startQuery(queryName);
  
  try {
    const result = await queryFn();
    const recordCount = Array.isArray(result.data) ? result.data.length : undefined;
    performanceMonitor.endQuery(queryName, recordCount, result.error?.message);
    return result;
  } catch (error) {
    performanceMonitor.endQuery(queryName, undefined, error.message);
    throw error;
  }
}

/**
 * Utilitário para medir tempo de execução de qualquer função
 */
export async function measureTime<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`⏱️ ${label} (ERROR): ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}