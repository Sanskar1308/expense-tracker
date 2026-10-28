export type BalExpense = {
  accountId: string | null;
  type: string;
  amount: number;
  paymentMethod: string | null;
  cardId?: string | null;
  createdAt?: Date;
};

export type BalMove = {
  fromAccountId: string;
  toAccountId: string | null;
  cardId?: string | null;
  amount: number;
  createdAt?: Date;
};

export function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export function accountBalance(
  account: { id: string; openingBalance: number },
  expenses: BalExpense[],
  moves: BalMove[]
) {
  let bal = account.openingBalance;
  for (const e of expenses) {
    if (e.accountId !== account.id) continue;
    if (e.type === "CREDIT") bal += e.amount;
    else if (e.paymentMethod === "CASH" || e.paymentMethod === "UPI") {
      bal -= e.amount;
    }
  }
  for (const m of moves) {
    if (m.fromAccountId === account.id) bal -= m.amount;
    if (m.toAccountId === account.id) bal += m.amount;
  }
  return roundMoney(bal);
}

/** Cash/UPI/credits not tied to an account yet. */
export function unassignedBalance(expenses: BalExpense[]) {
  let bal = 0;
  for (const e of expenses) {
    if (e.accountId) continue;
    if (e.type === "CREDIT") bal += e.amount;
    else if (e.paymentMethod === "CASH" || e.paymentMethod === "UPI") {
      bal -= e.amount;
    }
  }
  return roundMoney(bal);
}

export function cardCycleOwed(
  cardId: string,
  cycleStart: Date,
  cycleEnd: Date,
  expenses: BalExpense[],
  moves: BalMove[]
) {
  let spent = 0;
  for (const r of expenses) {
    if (r.type !== "DEBIT" || r.paymentMethod !== "CC" || r.cardId !== cardId) {
      continue;
    }
    if (!r.createdAt || r.createdAt < cycleStart || r.createdAt > cycleEnd) continue;
    spent += r.amount;
  }
  let paid = 0;
  for (const m of moves) {
    if (m.cardId !== cardId || !m.createdAt) continue;
    if (m.createdAt < cycleStart || m.createdAt > cycleEnd) continue;
    paid += m.amount;
  }
  return roundMoney(Math.max(0, spent - paid));
}
