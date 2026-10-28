import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireUser } from "../../../lib/session-user";
import { ensureMoneyAccounts } from "../../../lib/accounts";
import { accountBalance, roundMoney, unassignedBalance } from "../../../lib/balances";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureMoneyAccounts(user.id);

  const [accounts, expenses, moves] = await Promise.all([
    prisma.moneyAccount.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.expense.findMany({
      where: { userId: user.id },
      select: {
        accountId: true,
        type: true,
        amount: true,
        paymentMethod: true,
      },
    }),
    prisma.ledgerMove.findMany({
      where: { userId: user.id },
      select: { fromAccountId: true, toAccountId: true, amount: true },
    }),
  ]);

  const rows = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    openingBalance: a.openingBalance,
    isActive: a.isActive,
    balance: accountBalance(a, expenses, moves),
  }));
  const unassigned = unassignedBalance(expenses);
  const liquid = roundMoney(
    rows.reduce((s, a) => s + a.balance, 0) + unassigned
  );

  return NextResponse.json({ accounts: rows, unassigned, liquid });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureMoneyAccounts(user.id);

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const openingBalance = Number(body.openingBalance ?? 0);
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }
  if (!Number.isFinite(openingBalance)) {
    return NextResponse.json({ error: "Opening balance required" }, { status: 400 });
  }

  try {
    const account = await prisma.moneyAccount.create({
      data: { userId: user.id, name, openingBalance },
    });
    return NextResponse.json(account);
  } catch {
    return NextResponse.json(
      { error: "An account with that name already exists" },
      { status: 400 }
    );
  }
}
