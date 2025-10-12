import { toGroupSummary, toGroupMemberInfo, type GroupSummary, type GroupMemberInfo } from '../group-serializers'
import type { Group, Membership, User } from '@prisma/client'

describe('Group serializers', () => {
  const mockUser: User = {
    id: 'user1',
    name: 'John Doe',
    email: 'john@example.com',
    emailVerified: null,
    image: null,
    role: 'MEMBER',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  }

  const mockGroup: Group = {
    id: 'group1',
    name: 'Test Group',
    currency: 'USD',
    description: 'A test group',
    ownerId: 'user1',
    inviteCode: 'ABC123',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  }

  const mockMembership: Membership = {
    id: 'membership1',
    userId: 'user1',
    groupId: 'group1',
    role: 'OWNER',
    joinedAt: new Date('2024-01-01T00:00:00Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  }

  describe('toGroupSummary', () => {
    it('should serialize group with memberships correctly', () => {
      const groupWithMemberships = {
        ...mockGroup,
        memberships: [
          {
            id: 'membership1',
            userId: 'user1',
            role: 'OWNER' as const,
          },
          {
            id: 'membership2',
            userId: 'user2',
            role: 'MEMBER' as const,
          },
        ],
      }

      const result = toGroupSummary(groupWithMemberships, 'user1', 5000)

      expect(result).toEqual({
        id: 'group1',
        name: 'Test Group',
        description: 'A test group',
        currency: 'USD',
        inviteCode: 'ABC123',
        memberCount: 2,
        role: 'OWNER',
        membershipId: 'membership1',
        netBalanceCents: 5000,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      })
    })

    it('should handle group without invite code', () => {
      const groupWithMemberships = {
        ...mockGroup,
        inviteCode: null,
        memberships: [
          {
            id: 'membership1',
            userId: 'user1',
            role: 'OWNER' as const,
          },
        ],
      }

      const result = toGroupSummary(groupWithMemberships, 'user1', 0)

      expect(result.inviteCode).toBeNull()
    })

    it('should handle member role correctly', () => {
      const groupWithMemberships = {
        ...mockGroup,
        memberships: [
          {
            id: 'membership1',
            userId: 'user1',
            role: 'MEMBER' as const,
          },
        ],
      }

      const result = toGroupSummary(groupWithMemberships, 'user1', 0)

      expect(result.role).toBe('MEMBER')
    })

    it('should handle user not found in memberships', () => {
      const groupWithMemberships = {
        ...mockGroup,
        memberships: [
          {
            id: 'membership2',
            userId: 'user2',
            role: 'MEMBER' as const,
          },
        ],
      }

      const result = toGroupSummary(groupWithMemberships, 'user1', 0)

      expect(result.role).toBe('MEMBER')
      expect(result.membershipId).toBeNull()
    })

    it('should handle null net balance', () => {
      const groupWithMemberships = {
        ...mockGroup,
        memberships: [
          {
            id: 'membership1',
            userId: 'user1',
            role: 'OWNER' as const,
          },
        ],
      }

      const result = toGroupSummary(groupWithMemberships, 'user1', null)

      expect(result.netBalanceCents).toBeNull()
    })
  })

  describe('toGroupMemberInfo', () => {
    it('should serialize membership with user correctly', () => {
      const membershipWithUser = {
        ...mockMembership,
        user: mockUser,
      }

      const result = toGroupMemberInfo(membershipWithUser)

      expect(result).toEqual({
        membershipId: 'membership1',
        userId: 'user1',
        role: 'OWNER',
        name: 'John Doe',
        email: 'john@example.com',
        image: null,
        joinedAt: '2024-01-01T00:00:00.000Z',
      })
    })

    it('should handle membership without user', () => {
      const membershipWithUser = {
        ...mockMembership,
        user: null,
      }

      const result = toGroupMemberInfo(membershipWithUser)

      expect(result).toEqual({
        membershipId: 'membership1',
        userId: 'user1',
        role: 'OWNER',
        name: null,
        email: null,
        image: null,
        joinedAt: '2024-01-01T00:00:00.000Z',
      })
    })

    it('should handle user with missing fields', () => {
      const membershipWithUser = {
        ...mockMembership,
        user: {
          ...mockUser,
          name: null,
          email: null,
          image: null,
        },
      }

      const result = toGroupMemberInfo(membershipWithUser)

      expect(result.name).toBeNull()
      expect(result.email).toBeNull()
      expect(result.image).toBeNull()
    })

    it('should handle member role', () => {
      const membershipWithUser = {
        ...mockMembership,
        role: 'MEMBER' as const,
        user: mockUser,
      }

      const result = toGroupMemberInfo(membershipWithUser)

      expect(result.role).toBe('MEMBER')
    })
  })
})
