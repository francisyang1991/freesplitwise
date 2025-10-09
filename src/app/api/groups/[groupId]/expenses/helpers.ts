import { parseCurrencyToCents } from "@/lib/currency";

export type GroupMembershipLite = {
  id: string;
  userId: string;
};

export type ParsedExpenseInput = {
  description: string;
  currency: string;
  totalAmountCents: number;
  occurredAt: Date;
  payers: { membershipId: string; amountCents: number }[];
  shares: { membershipId: string; weight: number; amountCents: number }[];
};

const sanitizeWeight = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const normalizeDate = (value: unknown) => {
  if (!value) return new Date();
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }
  return date;
};

export const parseExpensePayload = (
  body: unknown,
  memberships: GroupMembershipLite[],
  fallbackCurrency: string,
): ParsedExpenseInput => {
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const descriptionRaw = payload.description;
  const currencyRaw = payload.currency;
  const totalAmountRaw = payload.totalAmount;
  const occurredAtRaw = payload.occurredAt;

  const description = typeof descriptionRaw === "string" ? descriptionRaw.trim() : "";
  const currency =
    typeof currencyRaw === "string" && currencyRaw.trim()
      ? currencyRaw.trim().toUpperCase()
      : fallbackCurrency;
  const totalAmountCents = parseCurrencyToCents(totalAmountRaw);
  const occurredAt = normalizeDate(occurredAtRaw);

  if (!description) {
    throw new Error("Description is required");
  }

  if (!totalAmountCents || totalAmountCents <= 0) {
    throw new Error("Total amount must be greater than zero");
  }

  const membershipIds = new Set(memberships.map((m) => m.id));

  const rawPayers = Array.isArray(payload.payers) ? payload.payers : [];
  const payers = rawPayers
    .map((payer) => {
      if (!payer || typeof payer !== "object") return null;
      if (!("membershipId" in payer) || !("amount" in payer)) return null;
      const membershipId = String((payer as { membershipId: unknown }).membershipId);
      const amountCents = parseCurrencyToCents((payer as { amount: unknown }).amount);
      if (!membershipIds.has(membershipId) || !amountCents || amountCents <= 0) {
        return null;
      }
      return { membershipId, amountCents };
    })
    .filter((payer): payer is { membershipId: string; amountCents: number } => payer !== null);

  if (payers.length === 0) {
    throw new Error("At least one payer with an amount is required");
  }

  const uniquePayers = new Set<string>();
  for (const payer of payers) {
    if (uniquePayers.has(payer.membershipId)) {
      throw new Error("Duplicate payer entries detected");
    }
    uniquePayers.add(payer.membershipId);
  }

  const totalPaidCents = payers.reduce((sum, payer) => sum + payer.amountCents, 0);
  if (totalPaidCents !== totalAmountCents) {
    throw new Error("Payer amounts must add up to the total");
  }

  const rawShares = Array.isArray(payload.shares) ? payload.shares : [];
  const sharesWeights = rawShares
    .map((share) => {
      if (!share || typeof share !== "object") return null;
      if (!("membershipId" in share) || !("weight" in share)) return null;
      const membershipId = String((share as { membershipId: unknown }).membershipId);
      const weight = sanitizeWeight((share as { weight: unknown }).weight);
      if (!membershipIds.has(membershipId) || !weight) {
        return null;
      }
      return { membershipId, weight };
    })
    .filter((share): share is { membershipId: string; weight: number } => share !== null);

  if (sharesWeights.length === 0) {
    throw new Error("Include at least one participant with a weight");
  }

  const uniqueShares = new Set<string>();
  for (const share of sharesWeights) {
    if (uniqueShares.has(share.membershipId)) {
      throw new Error("Duplicate participant entries detected");
    }
    uniqueShares.add(share.membershipId);
  }

  const totalWeight = sharesWeights.reduce((sum, share) => sum + share.weight, 0);
  if (totalWeight <= 0) {
    throw new Error("Participant weights must total more than zero");
  }

  let distributedCents = 0;
  const shares = sharesWeights.map((share, index) => {
    let shareAmount = Math.round((share.weight / totalWeight) * totalAmountCents);
    if (index === sharesWeights.length - 1) {
      shareAmount = totalAmountCents - distributedCents;
    }
    distributedCents += shareAmount;
    return {
      membershipId: share.membershipId,
      weight: share.weight,
      amountCents: shareAmount,
    };
  });

  return {
    description,
    currency,
    totalAmountCents,
    occurredAt,
    payers,
    shares,
  };
};
