import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/session-user";
import { getMonthKey } from "../../../lib/money";
import { DEFAULT_CATEGORIES } from "../../../lib/categories";

async function ensureMonthBudgets(userId: string, month: string) {
  const existing = await prisma.budget.findMany({
    where: { userId, month },
  });
  if (existing.length > 0) return existing;

  const prior = await prisma.budget.findMany({
    where: { userId, month: { lt: month } },
    orderBy: { month: "desc" },
  });
  if (prior.length === 0) return [];

  const priorMonth = prior[0].month;
  const priorRows = prior.filter((b) => b.month === priorMonth);

  await prisma.budget.createMany({
    data: priorRows.map((b) => ({
      userId,
      month,
      category: b.category,
      amount: b.amount,
    })),
  });

  return prisma.budget.findMany({ where: { userId, month } });
}

async function allowedCategories(userId: string): Promise<Set<string>> {
  const custom = await prisma.category.findMany({
    where: { userId, isActive: true },
    select: { name: true },
  });
  return new Set([
    ...DEFAULT_CATEGORIES.map((c) => c.value),
    ...custom.map((c) => c.name),
  ]);
}

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || getMonthKey();

  const budgets = await ensureMonthBudgets(user.id, month);
  return NextResponse.json({ month, budgets });
}

export async function PUT(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const month =
    typeof body.month === "string" && body.month
      ? body.month
      : getMonthKey();
  const items = Array.isArray(body.items) ? body.items : [];
  const allowed = await allowedCategories(user.id);

  for (const item of items) {
    const category = String(item.category ?? "").trim();
    if (!allowed.has(category)) {
      return NextResponse.json(
        { error: `Invalid category: ${category}` },
        { status: 400 }
      );
    }
    const amount = parseFloat(item.amount);
    if (!(amount >= 0)) {
      return NextResponse.json(
        { error: "Budget amount must be >= 0" },
        { status: 400 }
      );
    }

    await prisma.budget.upsert({
      where: {
        userId_category_month: {
          userId: user.id,
          category,
          month,
        },
      },
      create: {
        userId: user.id,
        category,
        month,
        amount,
      },
      update: { amount },
    });
  }

  const budgets = await prisma.budget.findMany({
    where: { userId: user.id, month },
  });

  return NextResponse.json({ month, budgets });
}
