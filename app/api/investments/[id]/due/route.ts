import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireUser } from "../../../../../lib/session-user";
import { createOwedDue, parseDueDate } from "../../../../../lib/investment-due";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.investment.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  const fromWhom = String(body.fromWhom ?? "").trim();
  if (!Number.isFinite(amount) || !(amount > 0)) {
    return NextResponse.json({ error: "Amount required" }, { status: 400 });
  }
  if (!fromWhom) {
    return NextResponse.json({ error: "From whom required" }, { status: 400 });
  }
  let dueDate: Date | null;
  try {
    dueDate = parseDueDate(body.dueDate);
  } catch {
    return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
  }
  let grams: number | null = null;
  if (body.grams != null && body.grams !== "") {
    grams = Number(body.grams);
    if (!Number.isFinite(grams) || grams < 0) {
      return NextResponse.json({ error: "Invalid grams" }, { status: 400 });
    }
    if (grams === 0) grams = null;
  }
  const tracksGrams = existing.kind === "GOLD" || existing.kind === "SILVER";
  if (!tracksGrams) grams = null;

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.investment.update({
      where: { id },
      data: {
        investedAmount: existing.investedAmount + amount,
        currentValue: existing.currentValue + amount,
        ...(grams != null ? { grams: (existing.grams ?? 0) + grams } : {}),
      },
    });
    await createOwedDue(tx, {
      userId: user.id,
      investmentId: id,
      title: existing.name,
      amount,
      fromWhom,
      dueDate,
    });
    return updated;
  });

  return NextResponse.json(row);
}
