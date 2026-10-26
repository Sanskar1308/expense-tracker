import { NextResponse } from "next/server";
import { PaymentMethod, TransactionType } from "@prisma/client";
import { prisma } from "../../../../lib/prisma";
import { requireUser } from "../../../../lib/session-user";
import { clampDayOfMonth } from "../../../../lib/dues";
import { validateTransactionPayload } from "../../../../lib/money";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.recurringRule.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  if (body.title != null || body.amount != null || body.category != null) {
    const title = body.title != null ? String(body.title).trim() : existing.title;
    const amount =
      body.amount != null ? parseFloat(body.amount) : existing.amount;
    const category =
      body.category != null
        ? String(body.category).trim()
        : existing.category;
    const type = (body.type as TransactionType) || existing.type;
    const paymentMethod =
      body.paymentMethod !== undefined
        ? body.paymentMethod
        : existing.paymentMethod;
    const cardId =
      body.cardId !== undefined ? body.cardId : existing.cardId;

    const error = validateTransactionPayload({
      title,
      amount,
      category,
      type,
      paymentMethod,
      cardId,
    });
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    data.title = title;
    data.amount = amount;
    data.category = category;
    data.type = type;
    data.paymentMethod =
      type === "CREDIT" ? null : (paymentMethod as PaymentMethod);
    data.cardId =
      type === "CREDIT" || paymentMethod !== "CC" ? null : String(cardId);
  }

  if (body.payee !== undefined) {
    data.payee = body.payee ? String(body.payee).trim() : null;
  }
  if (body.dayOfMonth != null) {
    data.dayOfMonth = clampDayOfMonth(Number(body.dayOfMonth));
  }
  if (body.totalMonths !== undefined) {
    data.totalMonths =
      body.totalMonths === null || body.totalMonths === ""
        ? null
        : Math.max(1, Math.floor(Number(body.totalMonths)));
  }

  const updated = await prisma.recurringRule.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.recurringRule.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.recurringRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
