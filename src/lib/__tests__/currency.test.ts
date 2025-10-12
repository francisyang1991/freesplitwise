import { formatCurrency, parseCurrencyToCents } from '../currency'

describe('Currency utilities', () => {
  describe('parseCurrencyToCents', () => {
    it('should parse numeric values correctly', () => {
      expect(parseCurrencyToCents(1.00)).toBe(100)
      expect(parseCurrencyToCents(1.50)).toBe(150)
      expect(parseCurrencyToCents(0.01)).toBe(1)
      expect(parseCurrencyToCents(100)).toBe(10000)
    })

    it('should parse string values correctly', () => {
      expect(parseCurrencyToCents('1.00')).toBe(100)
      expect(parseCurrencyToCents('1.50')).toBe(150)
      expect(parseCurrencyToCents('0.01')).toBe(1)
      expect(parseCurrencyToCents('100')).toBe(10000)
    })

    it('should handle edge cases', () => {
      expect(parseCurrencyToCents('')).toBe(null)
      expect(parseCurrencyToCents('invalid')).toBe(null)
      expect(parseCurrencyToCents(null)).toBe(null)
      expect(parseCurrencyToCents(undefined)).toBe(null)
      expect(parseCurrencyToCents(NaN)).toBe(null)
    })

    it('should handle formatted currency strings', () => {
      expect(parseCurrencyToCents('$1.00')).toBe(100)
      expect(parseCurrencyToCents('€1.50')).toBe(150)
      expect(parseCurrencyToCents('1,00')).toBe(10000) // Comma as decimal separator
      expect(parseCurrencyToCents('1.00.00')).toBe(null) // Invalid format
    })

    it('should handle whitespace', () => {
      expect(parseCurrencyToCents(' 1.00 ')).toBe(100)
      expect(parseCurrencyToCents('\t1.50\t')).toBe(150)
    })

    it('should round to nearest cent', () => {
      expect(parseCurrencyToCents(1.234)).toBe(123)
      expect(parseCurrencyToCents(1.235)).toBe(124)
      expect(parseCurrencyToCents('1.234')).toBe(123)
      expect(parseCurrencyToCents('1.235')).toBe(124)
    })
  })

  describe('formatCurrency', () => {
    it('should format USD correctly', () => {
      expect(formatCurrency(100, 'USD')).toBe('$1.00')
      expect(formatCurrency(150, 'USD')).toBe('$1.50')
      expect(formatCurrency(1, 'USD')).toBe('$0.01')
      expect(formatCurrency(10000, 'USD')).toBe('$100.00')
    })

    it('should format EUR correctly', () => {
      expect(formatCurrency(100, 'EUR')).toBe('€1.00')
      expect(formatCurrency(150, 'EUR')).toBe('€1.50')
    })

    it('should handle zero amounts', () => {
      expect(formatCurrency(0, 'USD')).toBe('$0.00')
    })

    it('should handle large amounts', () => {
      expect(formatCurrency(1000000, 'USD')).toBe('$10,000.00')
    })

    it('should fallback for unsupported currencies', () => {
      const result = formatCurrency(100, 'XYZ')
      expect(result).toContain('1.00')
      expect(result).toContain('XYZ')
    })
  })
})
