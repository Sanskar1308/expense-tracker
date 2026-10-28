import { NextResponse } from "next/server";
import { InvestmentKind } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/session-user";
import { roundMoney } from "../../../lib/balances";
import { clampDayOfMonth, ensurePendingsForUser } from "../../../lib/dues";

const KINDS = new Set<string>(Object.values(InvestmentKind));

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.investment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: {
      rules: {
        where: { isActive: true },
        select: { amount: true, dayOfMonth: true, totalMonths: true },
        take: 1,
      },
    },
  });

  return NextResponse.json(
    rows.map((r) => ({
      ...r,
      gain: roundMoney(r.currentValue - r.investedAmount),
      monthly: r.rules[0] ?? null,
      rules: undefined,
    }))
  );
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const kind = String(body.kind ?? "");
  const investedAmount = Number(body.investedAmount ?? 0);
  const currentValue = Number(body.currentValue ?? investedAmount);
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  if (!KINDS.has(kind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }
  if (!Number.isFinite(investedAmount) || investedAmount < 0) {
    return NextResponse.json({ error: "Invalid invested amount" }, { status: 400 });
  }
  if (!Number.isFinite(currentValue) || currentValue < 0) {
    return NextResponse.json({ error: "Invalid current value" }, { status: 400 });
  }

  const tracksGrams = kind === "GOLD" || kind === "SILVER";
  let grams: number | null = null;
  if (tracksGrams && body.grams != null && body.grams !== "") {
    grams = Number(body.grams);
    if (!Number.isFinite(grams) || grams < 0) {
      return NextResponse.json({ error: "Invalid grams" }, { status: 400 });
    }
  }

  const canMonthly = kind === "MF" || kind === "RD";
  const monthly = canMonthly && body.schedule === "monthly";
  const monthlyAmount = Number(body.monthlyAmount);
  const totalMonths =
    body.totalMonths != null && body.totalMonths !== ""
      ? Math.max(1, Math.floor(Number(body.totalMonths)))
      : null;
  if (monthly && !(monthlyAmount > 0)) {
    return NextResponse.json({ error: "Monthly amount required" }, { status: 400 });
  }

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.investment.create({
      data: {
        userId: user.id,
        name,
        kind: kind as InvestmentKind,
        investedAmount,
        currentValue,
        grams,
      },
    });
    if (monthly) {
      await tx.recurringRule.create({
        data: {
          userId: user.id,
          title: name,
          amount: monthlyAmount,
          category: "INVEST",
          type: "DEBIT",
          investmentId: created.id,
          dayOfMonth: clampDayOfMonth(Number(body.dayOfMonth) || 1),
          totalMonths,
        },
      });
    }
    return created;
  });

  if (monthly) await ensurePendingsForUser(user.id);
  return NextResponse.json(row);
}
