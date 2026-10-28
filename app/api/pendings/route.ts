import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/session-user";
import { ensurePendingsForUser } from "../../../lib/dues";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensurePendingsForUser(user.id);

  // Heal: expense deleted left status PAID with no expenseId
  // Investment cuts are paid with no expense row. Leave those alone.
  await prisma.pendingPayment.updateMany({
    where: {
      userId: user.id,
      status: "PAID",
      expenseId: null,
      investmentId: null,
    },
    data: { status: "PENDING" },
  });

  const pendings = await prisma.pendingPayment.findMany({
    where: { userId: user.id },
    include: {
      rule: {
        select: { totalMonths: true, isActive: true },
      },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });

  const investmentIds = [
    ...new Set(
      pendings.map((p) => p.investmentId).filter((id): id is string => !!id)
    ),
  ];
  const investments =
    investmentIds.length === 0
      ? []
      : await prisma.investment.findMany({
          where: { id: { in: investmentIds } },
          select: { id: true, kind: true, name: true },
        });
  const investmentById = new Map(investments.map((inv) => [inv.id, inv]));

  const withProgress = await Promise.all(
    pendings.map(async (p) => {
      const paidCount = await prisma.pendingPayment.count({
        where: { ruleId: p.ruleId, status: "PAID" },
      });
      return {
        ...p,
        paidCount,
        totalMonths: p.rule.totalMonths,
        investment: p.investmentId
          ? (investmentById.get(p.investmentId) ?? null)
          : null,
      };
    })
  );

  return NextResponse.json(withProgress);
}
