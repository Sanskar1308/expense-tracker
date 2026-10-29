import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/session-user";
import { findOwnAccount } from "../../../lib/accounts";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ponytail: last 30 manual moves. Dues undo covers SIP/RD. Raise the take if older moves need undo.
  const rows = await prisma.ledgerMove.findMany({
    where: { userId: user.id, pendingId: null },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      fromAccount: { select: { name: true } },
      toAccount: { select: { name: true } },
      card: { select: { name: true } },
      investment: { select: { name: true } },
    },
  });

  return NextResponse.json(
    rows.map((m) => ({
      id: m.id,
      amount: m.amount,
      note: m.note,
      createdAt: m.createdAt,
      fromName: m.fromAccount.name,
      toName: m.toAccount?.name ?? m.card?.name ?? m.investment?.name ?? "Removed",
      investmentId: m.investmentId,
    }))
  );
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const amount = Number(body.amount);
  if (!(amount > 0)) {
    return NextResponse.json({ error: "Positive amount required" }, { status: 400 });
  }

  const from = await findOwnAccount(user.id, body.fromAccountId);
  if (!from) {
    return NextResponse.json({ error: "From account required" }, { status: 400 });
  }

  const toId = body.toAccountId ? String(body.toAccountId) : null;
  const cardId = body.cardId ? String(body.cardId) : null;
  const investmentId = body.investmentId ? String(body.investmentId) : null;
  const destCount = [toId, cardId, investmentId].filter(Boolean).length;
  if (destCount !== 1) {
    return NextResponse.json(
      { error: "Pick one destination: account, card, or investment" },
      { status: 400 }
    );
  }
  if (toId && toId === from.id) {
    return NextResponse.json(
      { error: "Pick a different account" },
      { status: 400 }
    );
  }

  if (toId) {
    const to = await findOwnAccount(user.id, toId);
    if (!to) {
      return NextResponse.json({ error: "Invalid account" }, { status: 400 });
    }
  }
  if (cardId) {
    const card = await prisma.creditCard.findFirst({
      where: { id: cardId, userId: user.id },
    });
    if (!card) {
      return NextResponse.json({ error: "Invalid card" }, { status: 400 });
    }
  }

  const note = body.note ? String(body.note).trim() : null;

  if (investmentId) {
    const inv = await prisma.investment.findFirst({
      where: { id: investmentId, userId: user.id },
    });
    if (!inv) {
      return NextResponse.json({ error: "Invalid investment" }, { status: 400 });
    }
    const move = await prisma.$transaction(async (tx) => {
      const created = await tx.ledgerMove.create({
        data: {
          userId: user.id,
          amount,
          note,
          fromAccountId: from.id,
          investmentId: inv.id,
        },
      });
      await tx.investment.update({
        where: { id: inv.id },
        data: {
          investedAmount: inv.investedAmount + amount,
          currentValue: inv.currentValue + amount,
        },
      });
      return created;
    });
    return NextResponse.json(move);
  }

  const move = await prisma.ledgerMove.create({
    data: {
      userId: user.id,
      amount,
      note,
      fromAccountId: from.id,
      toAccountId: toId,
      cardId,
    },
  });
  return NextResponse.json(move);
}
