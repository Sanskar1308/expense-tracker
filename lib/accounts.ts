import { prisma } from "./prisma";

/** First time someone already has cash history, park it in one account. */
export async function ensureMoneyAccounts(userId: string) {
  const legacy = await prisma.moneyAccount.findFirst({
    where: { userId, name: "Cash & UPI" },
  });
  if (legacy) {
    const cash = await prisma.moneyAccount.findFirst({
      where: { userId, name: "Cash" },
    });
    if (!cash) {
      await prisma.moneyAccount.update({
        where: { id: legacy.id },
        data: { name: "Cash" },
      });
    }
  }

  const cash = await prisma.moneyAccount.findFirst({
    where: { userId, name: "Cash" },
  });
  if (cash) return;

  const account = await prisma.moneyAccount.create({
    data: { userId, name: "Cash", openingBalance: 0 },
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
