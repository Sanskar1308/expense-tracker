import { prisma } from "./prisma";

/** First time someone already has cash history, park it in one account. */
export async function ensureMoneyAccounts(userId: string) {
  const count = await prisma.moneyAccount.count({ where: { userId } });
  if (count > 0) return;

  const loose = await prisma.expense.count({
    where: {
      userId,
      accountId: null,
      OR: [
        { type: "CREDIT" },
        { paymentMethod: { in: ["CASH", "UPI"] } },
      ],
    },
  });
  if (loose === 0) return;

  const account = await prisma.moneyAccount.create({
    data: { userId, name: "Cash & UPI", openingBalance: 0 },
  });
  await prisma.expense.updateMany({
    where: {
      userId,
      accountId: null,
      OR: [
        { type: "CREDIT" },
        { paymentMethod: { in: ["CASH", "UPI"] } },
      ],
    },
    data: { accountId: account.id },
  });
}

export async function findOwnAccount(userId: string, accountId: unknown) {
  if (typeof accountId !== "string" || !accountId) return null;
  return prisma.moneyAccount.findFirst({
    where: { id: accountId, userId },
  });
}
