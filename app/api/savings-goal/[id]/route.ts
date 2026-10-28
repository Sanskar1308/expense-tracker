import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/session-user";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.savingsGoal.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: {
    title?: string | null;
    targetAmount?: number;
    savedAmount?: number;
    deadline?: Date;
  } = {};

  if (body.title !== undefined) {
    data.title = body.title ? String(body.title).trim() : null;
  }
  if (body.targetAmount != null) {
    const targetAmount = Number(body.targetAmount);
    if (!(targetAmount > 0)) {
      return NextResponse.json({ error: "Target must be positive" }, { status: 400 });
    }
    data.targetAmount = targetAmount;
  }
  if (body.savedAmount != null) {
    const savedAmount = Number(body.savedAmount);
    if (!Number.isFinite(savedAmount) || savedAmount < 0) {
      return NextResponse.json({ error: "Invalid saved amount" }, { status: 400 });
    }
    data.savedAmount = savedAmount;
  }
  if (body.deadline) data.deadline = new Date(body.deadline);

  const goal = await prisma.savingsGoal.update({ where: { id }, data });
  return NextResponse.json({ goal });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.savingsGoal.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.savingsGoal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
