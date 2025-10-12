import { parseExpensePayload, type GroupMembershipLite } from '../../app/api/groups/[groupId]/expenses/helpers'

describe('Expense helpers', () => {
  const mockMemberships: GroupMembershipLite[] = [
    { id: 'membership1', userId: 'user1' },
    { id: 'membership2', userId: 'user2' },
    { id: 'membership3', userId: 'user3' },
  ]

  describe('parseExpensePayload', () => {
    it('should parse valid expense payload', () => {
      const payload = {
        description: 'Dinner',
        totalAmount: '100.00',
        currency: 'USD',
        occurredAt: '2024-01-01T00:00:00Z',
        payers: [
          { membershipId: 'membership1', amount: '100.00' },
        ],
        shares: [
          { membershipId: 'membership1', weight: 1 },
          { membershipId: 'membership2', weight: 1 },
        ],
      }

      const result = parseExpensePayload(payload, mockMemberships, 'USD')
      
      expect(result.description).toBe('Dinner')
      expect(result.totalAmountCents).toBe(10000)
      expect(result.currency).toBe('USD')
      expect(result.payers).toHaveLength(1)
      expect(result.payers[0].membershipId).toBe('membership1')
      expect(result.payers[0].amountCents).toBe(10000)
      expect(result.shares).toHaveLength(2)
      expect(result.shares[0].membershipId).toBe('membership1')
      expect(result.shares[0].weight).toBe(1)
      expect(result.shares[0].amountCents).toBe(5000) // Half of 100
    })

    it('should handle multiple payers', () => {
      const payload = {
        description: 'Split bill',
        totalAmount: '120.00',
        currency: 'USD',
        occurredAt: '2024-01-01T00:00:00Z',
        payers: [
          { membershipId: 'membership1', amount: '60.00' },
          { membershipId: 'membership2', amount: '60.00' },
        ],
        shares: [
          { membershipId: 'membership1', weight: 1 },
          { membershipId: 'membership2', weight: 1 },
          { membershipId: 'membership3', weight: 1 },
        ],
      }

      const result = parseExpensePayload(payload, mockMemberships, 'USD')
      
      expect(result.totalAmountCents).toBe(12000)
      expect(result.payers).toHaveLength(2)
      expect(result.payers[0].amountCents).toBe(6000)
      expect(result.payers[1].amountCents).toBe(6000)
      expect(result.shares).toHaveLength(3)
      expect(result.shares[0].amountCents).toBe(4000) // 120/3 = 40 each
    })

    it('should validate payer amounts match total', () => {
      const payload = {
        description: 'Mismatched amounts',
        totalAmount: '100.00',
        currency: 'USD',
        occurredAt: '2024-01-01T00:00:00Z',
        payers: [
          { membershipId: 'membership1', amount: '60.00' },
          { membershipId: 'membership2', amount: '50.00' }, // Total: 110, not 100
        ],
        shares: [
          { membershipId: 'membership1', weight: 1 },
          { membershipId: 'membership2', weight: 1 },
        ],
      }

      expect(() => {
        parseExpensePayload(payload, mockMemberships, 'USD')
      }).toThrow('Payer amounts must add up to the total')
    })

    it('should validate required fields', () => {
      const payload = {
        totalAmount: '100.00',
        currency: 'USD',
        occurredAt: '2024-01-01T00:00:00Z',
        payers: [{ membershipId: 'membership1', amount: '100.00' }],
        shares: [{ membershipId: 'membership1', weight: 1 }],
      }

      expect(() => {
        parseExpensePayload(payload, mockMemberships, 'USD')
      }).toThrow('Description is required')
    })

    it('should validate total amount is positive', () => {
      const payload = {
        description: 'Negative amount',
        totalAmount: '0',
        currency: 'USD',
        occurredAt: '2024-01-01T00:00:00Z',
        payers: [{ membershipId: 'membership1', amount: '0' }],
        shares: [{ membershipId: 'membership1', weight: 1 }],
      }

      expect(() => {
        parseExpensePayload(payload, mockMemberships, 'USD')
      }).toThrow('Total amount must be greater than zero')
    })

    it('should validate at least one payer', () => {
      const payload = {
        description: 'No payers',
        totalAmount: '100.00',
        currency: 'USD',
        occurredAt: '2024-01-01T00:00:00Z',
        payers: [],
        shares: [{ membershipId: 'membership1', weight: 1 }],
      }

      expect(() => {
        parseExpensePayload(payload, mockMemberships, 'USD')
      }).toThrow('At least one payer with an amount is required')
    })

    it('should validate at least one participant', () => {
      const payload = {
        description: 'No participants',
        totalAmount: '100.00',
        currency: 'USD',
        occurredAt: '2024-01-01T00:00:00Z',
        payers: [{ membershipId: 'membership1', amount: '100.00' }],
        shares: [],
      }

      expect(() => {
        parseExpensePayload(payload, mockMemberships, 'USD')
      }).toThrow('Include at least one participant with a weight')
    })

    it('should prevent duplicate payers', () => {
      const payload = {
        description: 'Duplicate payers',
        totalAmount: '100.00',
        currency: 'USD',
        occurredAt: '2024-01-01T00:00:00Z',
        payers: [
          { membershipId: 'membership1', amount: '50.00' },
          { membershipId: 'membership1', amount: '50.00' }, // Duplicate
        ],
        shares: [{ membershipId: 'membership1', weight: 1 }],
      }

      expect(() => {
        parseExpensePayload(payload, mockMemberships, 'USD')
      }).toThrow('Duplicate payer entries detected')
    })

    it('should prevent duplicate participants', () => {
      const payload = {
        description: 'Duplicate participants',
        totalAmount: '100.00',
        currency: 'USD',
        occurredAt: '2024-01-01T00:00:00Z',
        payers: [{ membershipId: 'membership1', amount: '100.00' }],
        shares: [
          { membershipId: 'membership1', weight: 1 },
          { membershipId: 'membership1', weight: 1 }, // Duplicate
        ],
      }

      expect(() => {
        parseExpensePayload(payload, mockMemberships, 'USD')
      }).toThrow('Duplicate participant entries detected')
    })

    it('should validate participant weights', () => {
      const payload = {
        description: 'Invalid weights',
        totalAmount: '100.00',
        currency: 'USD',
        occurredAt: '2024-01-01T00:00:00Z',
        payers: [{ membershipId: 'membership1', amount: '100.00' }],
        shares: [
          { membershipId: 'membership1', weight: 0 }, // Invalid weight
        ],
      }

      expect(() => {
        parseExpensePayload(payload, mockMemberships, 'USD')
      }).toThrow('Include at least one participant with a weight')
    })

    it('should handle weighted splits correctly', () => {
      const payload = {
        description: 'Weighted split',
        totalAmount: '100.00',
        currency: 'USD',
        occurredAt: '2024-01-01T00:00:00Z',
        payers: [{ membershipId: 'membership1', amount: '100.00' }],
        shares: [
          { membershipId: 'membership1', weight: 2 }, // 2/3 of total
          { membershipId: 'membership2', weight: 1 }, // 1/3 of total
        ],
      }

      const result = parseExpensePayload(payload, mockMemberships, 'USD')
      
      expect(result.shares[0].amountCents).toBe(6667) // 2/3 of 10000, rounded
      expect(result.shares[1].amountCents).toBe(3333) // 1/3 of 10000, rounded
    })

    it('should handle invalid membership IDs', () => {
      const payload = {
        description: 'Invalid membership',
        totalAmount: '100.00',
        currency: 'USD',
        occurredAt: '2024-01-01T00:00:00Z',
        payers: [{ membershipId: 'invalid', amount: '100.00' }],
        shares: [{ membershipId: 'invalid', weight: 1 }],
      }

      expect(() => {
        parseExpensePayload(payload, mockMemberships, 'USD')
      }).toThrow('At least one payer with an amount is required')
    })

    it('should use fallback currency', () => {
      const payload = {
        description: 'No currency specified',
        totalAmount: '100.00',
        occurredAt: '2024-01-01T00:00:00Z',
        payers: [{ membershipId: 'membership1', amount: '100.00' }],
        shares: [{ membershipId: 'membership1', weight: 1 }],
      }

      const result = parseExpensePayload(payload, mockMemberships, 'EUR')
      expect(result.currency).toBe('EUR')
    })

    it('should normalize dates', () => {
      const payload = {
        description: 'Date test',
        totalAmount: '100.00',
        currency: 'USD',
        occurredAt: 'invalid-date',
        payers: [{ membershipId: 'membership1', amount: '100.00' }],
        shares: [{ membershipId: 'membership1', weight: 1 }],
      }

      const result = parseExpensePayload(payload, mockMemberships, 'USD')
      expect(result.occurredAt).toBeInstanceOf(Date)
    })
  })
})
