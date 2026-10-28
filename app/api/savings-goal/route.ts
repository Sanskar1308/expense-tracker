import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/session-user";

function progress(saved: number, target: number) {
  if (!(target > 0)) return 0;
  return Math.min(100, Math.max(0, (saved / target) * 100));
}

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const goals = await prisma.savingsGoal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    goals: goals.map((g) => ({
      ...g,
      progress: progress(g.savedAmount, g.targetAmount),
    })),
  });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const targetAmount = parseFloat(body.targetAmount);
  const savedAmount =
    body.savedAmount == null || body.savedAmount === ""
      ? 0
      : Number(body.savedAmount);
  if (!(targetAmount > 0)) {
    return NextResponse.json({ error: "Target must be positive" }, { status: 400 });
  }
  if (!body.deadline) {
    return NextResponse.json({ error: "Deadline required" }, { status: 400 });
  }
  if (!Number.isFinite(savedAmount) || savedAmount < 0) {
    return NextResponse.json({ error: "Invalid saved amount" }, { status: 400 });
  }

  const goal = await prisma.savingsGoal.create({
    data: {
      userId: user.id,
      title: body.title ? String(body.title).trim() : null,
      targetAmount,
      savedAmount,
      deadline: new Date(body.deadline),
    },
  });

  return NextResponse.json({ goal });
}
