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

  const pendings = await prisma.pendingPayment.findMany({
    where: { userId: user.id },
    include: {
      rule: {
        select: { totalMonths: true, isActive: true },
      },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });

  const withProgress = await Promise.all(
    pendings.map(async (p) => {
      const paidCount = await prisma.pendingPayment.count({
        where: { ruleId: p.ruleId, status: "PAID" },
      });
      return {
        ...p,
        paidCount,
        totalMonths: p.rule.totalMonths,
      };
    })
  );

  return NextResponse.json(withProgress);
}
