import type { PrismaClient } from "@prisma/client";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export const generateInviteCode = (length = 6) => {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * ALPHABET.length);
    code += ALPHABET[index];
  }
  return code;
};

export const generateUniqueInviteCode = async (
  prisma: PrismaClient,
  length = 6,
  maxAttempts = 10,
): Promise<string> => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateInviteCode(length);
    try {
      const existing = await prisma.group.findUnique({
        where: { inviteCode: code },
        select: { id: true },
      });
      if (!existing) {
        return code;
      }
    } catch (error) {
      console.error(
        "Failed to verify invite code uniqueness. Did you run the inviteCode migration?",
        error,
      );
      throw error;
    }
  }
  throw new Error("Unable to generate unique invite code");
};
