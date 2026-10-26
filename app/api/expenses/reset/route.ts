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

  const deleted = await prisma.expense.deleteMany({ where });

  return NextResponse.json({
    message: "Expenses deleted successfully",
    deletedCount: deleted.count,
  });
}
