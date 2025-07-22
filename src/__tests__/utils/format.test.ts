import { formatCurrency } from '../../utils/format';

describe('formatCurrency', () => {
  it('should format positive numbers correctly', () => {
    expect(formatCurrency(1500)).toBe('R$ 1.500,00');
    expect(formatCurrency(999.99)).toBe('R$ 999,99');
    expect(formatCurrency(0.5)).toBe('R$ 0,50');
  });

  it('should format zero correctly', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });

  it('should format large numbers correctly', () => {
    expect(formatCurrency(1000000)).toBe('R$ 1.000.000,00');
    expect(formatCurrency(1234567.89)).toBe('R$ 1.234.567,89');
  });

  it('should handle decimal places correctly', () => {
    expect(formatCurrency(10.1)).toBe('R$ 10,10');
    expect(formatCurrency(10.99)).toBe('R$ 10,99');
    expect(formatCurrency(10.999)).toBe('R$ 11,00'); // Rounds up
  });

  it('should format negative numbers correctly', () => {
    expect(formatCurrency(-100)).toBe('-R$ 100,00');
    expect(formatCurrency(-1500.50)).toBe('-R$ 1.500,50');
  });
});