import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../format';

describe('formatCurrency', () => {
  it('should format zero correctly', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });

  it('should format positive integers correctly', () => {
    expect(formatCurrency(100)).toBe('R$ 100,00');
    expect(formatCurrency(1500)).toBe('R$ 1.500,00');
    expect(formatCurrency(1000000)).toBe('R$ 1.000.000,00');
  });

  it('should format decimal values correctly', () => {
    expect(formatCurrency(99.99)).toBe('R$ 99,99');
    expect(formatCurrency(1234.56)).toBe('R$ 1.234,56');
    expect(formatCurrency(0.01)).toBe('R$ 0,01');
  });

  it('should format negative values correctly', () => {
    expect(formatCurrency(-100)).toBe('-R$ 100,00');
    expect(formatCurrency(-1234.56)).toBe('-R$ 1.234,56');
  });

  it('should handle very large numbers', () => {
    expect(formatCurrency(999999999.99)).toBe('R$ 999.999.999,99');
  });

  it('should handle very small decimal values', () => {
    expect(formatCurrency(0.001)).toBe('R$ 0,00'); // Rounds to 2 decimal places
    expect(formatCurrency(0.005)).toBe('R$ 0,01'); // Rounds up
  });

  it('should handle edge cases', () => {
    expect(formatCurrency(NaN)).toBe('R$ NaN');
    expect(formatCurrency(Infinity)).toBe('R$ ∞');
    expect(formatCurrency(-Infinity)).toBe('-R$ ∞');
  });
});