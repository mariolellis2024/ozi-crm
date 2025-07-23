import { describe, it, expect, vi, beforeEach } from 'vitest';
import { performanceMonitor, monitoredQuery, measureTime } from '../performance';

// Mock performance.now
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(),
  },
});

describe('Performance Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    performanceMonitor.clearMetrics();
    
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });

  describe('performanceMonitor', () => {
    it('should track query metrics', () => {
      const mockNow = vi.mocked(performance.now);
      mockNow.mockReturnValueOnce(100).mockReturnValueOnce(150);

      performanceMonitor.startQuery('test-query');
      performanceMonitor.endQuery('test-query', 5);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        queryName: 'test-query',
        duration: 50,
        recordCount: 5,
      });
    });

    it('should calculate stats correctly', () => {
      const mockNow = vi.mocked(performance.now);
      mockNow
        .mockReturnValueOnce(100).mockReturnValueOnce(150) // Query 1: 50ms
        .mockReturnValueOnce(200).mockReturnValueOnce(300) // Query 2: 100ms
        .mockReturnValueOnce(400).mockReturnValueOnce(1500); // Query 3: 1100ms (slow)

      performanceMonitor.startQuery('query-1');
      performanceMonitor.endQuery('query-1', 10);

      performanceMonitor.startQuery('query-2');
      performanceMonitor.endQuery('query-2', 20);

      performanceMonitor.startQuery('slow-query');
      performanceMonitor.endQuery('slow-query', 5);

      const stats = performanceMonitor.getStats();
      expect(stats).toMatchObject({
        totalQueries: 3,
        avgDuration: 383.33,
        maxDuration: 1100,
        minDuration: 50,
        slowQueries: 1,
      });
    });

    it('should handle errors in queries', () => {
      const mockNow = vi.mocked(performance.now);
      mockNow.mockReturnValueOnce(100).mockReturnValueOnce(150);

      performanceMonitor.startQuery('error-query');
      performanceMonitor.endQuery('error-query', undefined, 'Database connection failed');

      const metrics = performanceMonitor.getMetrics();
      expect(metrics[0]).toMatchObject({
        queryName: 'error-query',
        error: 'Database connection failed',
      });
    });
  });

  describe('monitoredQuery', () => {
    it('should monitor successful queries', async () => {
      const mockNow = vi.mocked(performance.now);
      mockNow.mockReturnValueOnce(100).mockReturnValueOnce(200);

      const mockQueryFn = vi.fn().mockResolvedValue({
        data: [{ id: 1 }, { id: 2 }],
        error: null,
      });

      const result = await monitoredQuery('test-monitored-query', mockQueryFn);

      expect(result).toEqual({
        data: [{ id: 1 }, { id: 2 }],
        error: null,
      });

      const metrics = performanceMonitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        queryName: 'test-monitored-query',
        recordCount: 2,
      });
    });

    it('should monitor failed queries', async () => {
      const mockNow = vi.mocked(performance.now);
      mockNow.mockReturnValueOnce(100).mockReturnValueOnce(200);

      const mockQueryFn = vi.fn().mockRejectedValue(new Error('Query failed'));

      await expect(
        monitoredQuery('failed-query', mockQueryFn)
      ).rejects.toThrow('Query failed');

      const metrics = performanceMonitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        queryName: 'failed-query',
        error: 'Query failed',
      });
    });
  });

  describe('measureTime', () => {
    it('should measure execution time', async () => {
      const mockNow = vi.mocked(performance.now);
      mockNow.mockReturnValueOnce(100).mockReturnValueOnce(250);

      const mockFn = vi.fn().mockResolvedValue('success');

      const result = await measureTime('test-function', mockFn);

      expect(result).toBe('success');
      expect(console.log).toHaveBeenCalledWith('⏱️ test-function: 150.00ms');
    });

    it('should measure execution time for failed functions', async () => {
      const mockNow = vi.mocked(performance.now);
      mockNow.mockReturnValueOnce(100).mockReturnValueOnce(200);

      const mockFn = vi.fn().mockRejectedValue(new Error('Function failed'));

      await expect(
        measureTime('failed-function', mockFn)
      ).rejects.toThrow('Function failed');

      expect(console.error).toHaveBeenCalledWith(
        '⏱️ failed-function (ERROR): 100.00ms',
        expect.any(Error)
      );
    });
  });
});