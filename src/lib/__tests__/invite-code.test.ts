import { generateInviteCode, generateUniqueInviteCode } from '../invite-code'

// Mock Prisma client
const mockPrisma = {
  group: {
    findUnique: jest.fn(),
  },
}

describe('Invite code generation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateInviteCode', () => {
    it('should generate code of specified length', () => {
      const code = generateInviteCode(6)
      expect(code).toHaveLength(6)
      expect(typeof code).toBe('string')
    })

    it('should generate code of default length', () => {
      const code = generateInviteCode()
      expect(code).toHaveLength(6)
    })

    it('should generate different codes on multiple calls', () => {
      const codes = Array.from({ length: 10 }, () => generateInviteCode(6))
      const uniqueCodes = new Set(codes)
      expect(uniqueCodes.size).toBeGreaterThan(1) // Very likely to be different
    })

    it('should generate alphanumeric codes', () => {
      const code = generateInviteCode(10)
      expect(code).toMatch(/^[a-zA-Z0-9]+$/)
    })

    it('should handle different lengths', () => {
      expect(generateInviteCode(4)).toHaveLength(4)
      expect(generateInviteCode(8)).toHaveLength(8)
      expect(generateInviteCode(12)).toHaveLength(12)
    })
  })

  describe('generateUniqueInviteCode', () => {
    it('should generate unique code when no conflict exists', async () => {
      mockPrisma.group.findUnique.mockResolvedValue(null)

      const code = await generateUniqueInviteCode(mockPrisma as PrismaClient, 6, 5)

      expect(code).toHaveLength(6)
      expect(mockPrisma.group.findUnique).toHaveBeenCalledWith({
        where: { inviteCode: code },
        select: { id: true },
      })
    })

    it('should retry when code conflicts exist', async () => {
      // First call returns existing group, second call returns null
      mockPrisma.group.findUnique
        .mockResolvedValueOnce({ id: 'existing-group' })
        .mockResolvedValueOnce(null)

      const code = await generateUniqueInviteCode(mockPrisma as PrismaClient, 6, 5)

      expect(code).toHaveLength(6)
      expect(mockPrisma.group.findUnique).toHaveBeenCalledTimes(2)
    })

    it('should throw error after max attempts', async () => {
      // Always return existing group
      mockPrisma.group.findUnique.mockResolvedValue({ id: 'existing-group' })

      await expect(
        generateUniqueInviteCode(mockPrisma as PrismaClient, 6, 3)
      ).rejects.toThrow('Unable to generate unique invite code')
    })

    it('should use default parameters', async () => {
      mockPrisma.group.findUnique.mockResolvedValue(null)

      const code = await generateUniqueInviteCode(mockPrisma as PrismaClient)

      expect(code).toHaveLength(6)
      expect(mockPrisma.group.findUnique).toHaveBeenCalledWith({
        where: { inviteCode: code },
        select: { id: true },
      })
    })

    it('should handle custom length and max attempts', async () => {
      mockPrisma.group.findUnique.mockResolvedValue(null)

      const code = await generateUniqueInviteCode(mockPrisma as PrismaClient, 8, 10)

      expect(code).toHaveLength(8)
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.group.findUnique.mockRejectedValue(new Error('Database error'))

      await expect(
        generateUniqueInviteCode(mockPrisma as PrismaClient, 6, 1)
      ).rejects.toThrow('Database error')
    })
  })
})
