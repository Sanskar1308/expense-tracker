import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/session-user";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { startDate, endDate, category } = await req.json();

  const where: Prisma.ExpenseWhereInput = { userId: user.id };

  if (startDate && endDate) {
    where.createdAt = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  if (category) {
    where.category = String(category);
  }

  const toDelete = await prisma.expense.findMany({
    where,
    select: { id: true },
  });
  const ids = toDelete.map((e) => e.id);

  if (ids.length === 0) {
    return NextResponse.json({
      message: "Expenses deleted successfully",
      deletedCount: 0,
    });
  }

  await prisma.$transaction(async (tx) => {
    const linked = await tx.pendingPayment.findMany({
      where: { expenseId: { in: ids }, status: "PAID" },
      select: { id: true, ruleId: true },
    });
    if (linked.length > 0) {
      await tx.pendingPayment.updateMany({
        where: { id: { in: linked.map((p) => p.id) } },
        data: { status: "PENDING", expenseId: null },
      });
      const ruleIds = [...new Set(linked.map((p) => p.ruleId))];
      await tx.recurringRule.updateMany({
        where: { id: { in: ruleIds } },
        data: { isActive: true },
      });
    }
    await tx.expense.deleteMany({ where: { id: { in: ids } } });
  });

  return NextResponse.json({
    message: "Expenses deleted successfully",
    deletedCount: ids.length,
  });
}
