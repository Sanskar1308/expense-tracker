import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/session-user";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const source = await prisma.expense.findFirst({
    where: { id, userId: user.id },
    include: { pendingPayment: { select: { id: true } } },
  });
  if (!source) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (source.pendingPayment) {
    return NextResponse.json(
      { error: "Recurring dues can't be repeated — use Dues next cycle" },
      { status: 400 }
    );
  }

  const clone = await prisma.expense.create({
    data: {
      title: source.title,
      amount: source.amount,
      category: source.category,
      type: source.type,
      paymentMethod: source.paymentMethod,
      cardId: source.cardId,
      accountId: source.accountId,
      userId: user.id,
      createdAt: new Date(),
    },
    include: { card: true },
  });

  return NextResponse.json(clone);
}
