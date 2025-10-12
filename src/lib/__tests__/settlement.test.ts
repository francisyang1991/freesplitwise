import {
  computeBalances,
  simplifySettlements,
  buildSettlementLedger,
  type BalanceEntry,
} from '../settlement'
import type { ExpenseSummary, GroupMemberInfo } from '../group-serializers'

describe('Settlement calculations', () => {
  const mockMembers: GroupMemberInfo[] = [
    {
      membershipId: 'member1',
      userId: 'user1',
      role: 'MEMBER',
      name: 'Alice',
      email: 'alice@example.com',
      image: null,
      joinedAt: '2024-01-01T00:00:00Z',
    },
    {
      membershipId: 'member2',
      userId: 'user2',
      role: 'MEMBER',
      name: 'Bob',
      email: 'bob@example.com',
      image: null,
      joinedAt: '2024-01-01T00:00:00Z',
    },
    {
      membershipId: 'member3',
      userId: 'user3',
      role: 'MEMBER',
      name: 'Charlie',
      email: 'charlie@example.com',
      image: null,
      joinedAt: '2024-01-01T00:00:00Z',
    },
  ]

  const createMockExpense = (
    id: string,
    payers: { membershipId: string; amountCents: number }[],
    shares: { membershipId: string; amountCents: number }[],
  ): ExpenseSummary => ({
    id,
    groupId: 'group1',
    description: 'Test expense',
    totalAmountCents: payers.reduce((sum, p) => sum + p.amountCents, 0),
    currency: 'USD',
    occurredAt: '2024-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    payers: payers.map((p) => ({
      id: `payer-${p.membershipId}`,
      membershipId: p.membershipId,
      amountCents: p.amountCents,
      user: mockMembers.find((m) => m.membershipId === p.membershipId) || null,
    })),
    shares: shares.map((s) => ({
      id: `share-${s.membershipId}`,
      membershipId: s.membershipId,
      weight: 1,
      amountCents: s.amountCents,
      user: mockMembers.find((m) => m.membershipId === s.membershipId) || null,
    })),
  })

  describe('computeBalances', () => {
    it('should compute balances correctly for simple case', () => {
      const expenses = [
        createMockExpense(
          'expense1',
          [{ membershipId: 'member1', amountCents: 100 }],
          [
            { membershipId: 'member1', amountCents: 50 },
            { membershipId: 'member2', amountCents: 50 },
          ],
        ),
      ]

      const balances = computeBalances(expenses, mockMembers)
      expect(balances).toHaveLength(3)

      const aliceBalance = balances.find((b) => b.membershipId === 'member1')
      const bobBalance = balances.find((b) => b.membershipId === 'member2')
      const charlieBalance = balances.find((b) => b.membershipId === 'member3')

      expect(aliceBalance?.netCents).toBe(50) // Paid 100, owes 50
      expect(bobBalance?.netCents).toBe(-50) // Paid 0, owes 50
      expect(charlieBalance?.netCents).toBe(0) // Paid 0, owes 0
    })

    it('should handle multiple expenses', () => {
      const expenses = [
        createMockExpense(
          'expense1',
          [{ membershipId: 'member1', amountCents: 100 }],
          [
            { membershipId: 'member1', amountCents: 50 },
            { membershipId: 'member2', amountCents: 50 },
          ],
        ),
        createMockExpense(
          'expense2',
          [{ membershipId: 'member2', amountCents: 60 }],
          [
            { membershipId: 'member2', amountCents: 30 },
            { membershipId: 'member3', amountCents: 30 },
          ],
        ),
      ]

      const balances = computeBalances(expenses, mockMembers)
      const aliceBalance = balances.find((b) => b.membershipId === 'member1')
      const bobBalance = balances.find((b) => b.membershipId === 'member2')
      const charlieBalance = balances.find((b) => b.membershipId === 'member3')

      expect(aliceBalance?.netCents).toBe(50) // Paid 100, owes 50
      expect(bobBalance?.netCents).toBe(-20) // Paid 60, owes 80 (50+30) = -20 net
      expect(charlieBalance?.netCents).toBe(-30) // Paid 0, owes 30
    })

    it('should handle zero balances', () => {
      const expenses = [
        createMockExpense(
          'expense1',
          [{ membershipId: 'member1', amountCents: 100 }],
          [{ membershipId: 'member1', amountCents: 100 }],
        ),
      ]

      const balances = computeBalances(expenses, mockMembers)
      const aliceBalance = balances.find((b) => b.membershipId === 'member1')
      expect(aliceBalance?.netCents).toBe(0)
    })
  })

  describe('simplifySettlements', () => {
    it('should simplify simple case', () => {
      const balances: BalanceEntry[] = [
        {
          membershipId: 'member1',
          netCents: 100,
          paidCents: 100,
          owedCents: 0,
          member: mockMembers[0],
        },
        {
          membershipId: 'member2',
          netCents: -100,
          paidCents: 0,
          owedCents: 100,
          member: mockMembers[1],
        },
      ]

      const settlements = simplifySettlements(balances)
      expect(settlements).toHaveLength(1)
      expect(settlements[0].fromMembershipId).toBe('member2')
      expect(settlements[0].toMembershipId).toBe('member1')
      expect(settlements[0].amountCents).toBe(100)
    })

    it('should handle three-way settlement', () => {
      const balances: BalanceEntry[] = [
        {
          membershipId: 'member1',
          netCents: 150,
          paidCents: 150,
          owedCents: 0,
          member: mockMembers[0],
        },
        {
          membershipId: 'member2',
          netCents: -100,
          paidCents: 0,
          owedCents: 100,
          member: mockMembers[1],
        },
        {
          membershipId: 'member3',
          netCents: -50,
          paidCents: 0,
          owedCents: 50,
          member: mockMembers[2],
        },
      ]

      const settlements = simplifySettlements(balances)
      expect(settlements).toHaveLength(2)
      
      const totalSettled = settlements.reduce((sum, s) => sum + s.amountCents, 0)
      expect(totalSettled).toBe(150)
    })

    it('should handle complex case with multiple creditors and debtors', () => {
      const balances: BalanceEntry[] = [
        {
          membershipId: 'member1',
          netCents: 200,
          paidCents: 200,
          owedCents: 0,
          member: mockMembers[0],
        },
        {
          membershipId: 'member2',
          netCents: -150,
          paidCents: 0,
          owedCents: 150,
          member: mockMembers[1],
        },
        {
          membershipId: 'member3',
          netCents: -50,
          paidCents: 0,
          owedCents: 50,
          member: mockMembers[2],
        },
      ]

      const settlements = simplifySettlements(balances)
      expect(settlements).toHaveLength(2)
      
      const totalSettled = settlements.reduce((sum, s) => sum + s.amountCents, 0)
      expect(totalSettled).toBe(200)
    })

    it('should handle zero balances', () => {
      const balances: BalanceEntry[] = [
        {
          membershipId: 'member1',
          netCents: 0,
          paidCents: 100,
          owedCents: 100,
          member: mockMembers[0],
        },
      ]

      const settlements = simplifySettlements(balances)
      expect(settlements).toHaveLength(0)
    })
  })

  describe('buildSettlementLedger', () => {
    it('should build complete settlement ledger', () => {
      const expenses = [
        createMockExpense(
          'expense1',
          [{ membershipId: 'member1', amountCents: 100 }],
          [
            { membershipId: 'member1', amountCents: 50 },
            { membershipId: 'member2', amountCents: 50 },
          ],
        ),
      ]

      const ledger = buildSettlementLedger(expenses, mockMembers)
      expect(ledger.balances).toHaveLength(3)
      expect(ledger.settlements).toHaveLength(1)
      
      const settlement = ledger.settlements[0]
      expect(settlement.fromMembershipId).toBe('member2')
      expect(settlement.toMembershipId).toBe('member1')
      expect(settlement.amountCents).toBe(50)
    })
  })
})
