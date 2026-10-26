import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/session-user";
import { computeMainBalance } from "../../../lib/money";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [goal, rows] = await Promise.all([
    prisma.savingsGoal.findUnique({ where: { userId: user.id } }),
    prisma.expense.findMany({
      where: { userId: user.id },
      select: {
        type: true,
        amount: true,
        paymentMethod: true,
        cardId: true,
        createdAt: true,
        category: true,
      },
    }),
  ]);

  const mainBalance = computeMainBalance(rows);
  return NextResponse.json({
    goal,
    mainBalance,
    progress:
      goal && goal.targetAmount > 0
        ? Math.min(100, (mainBalance / goal.targetAmount) * 100)
        : 0,
  });
}

export async function PUT(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const targetAmount = parseFloat(body.targetAmount);
  if (!(targetAmount > 0)) {
    return NextResponse.json({ error: "Target must be positive" }, { status: 400 });
  }
  if (!body.deadline) {
    return NextResponse.json({ error: "Deadline required" }, { status: 400 });
  }

  const goal = await prisma.savingsGoal.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      title: body.title ? String(body.title).trim() : null,
      targetAmount,
      deadline: new Date(body.deadline),
    },
    update: {
      title: body.title ? String(body.title).trim() : null,
      targetAmount,
      deadline: new Date(body.deadline),
    },
  });

  return NextResponse.json({ goal });
}
