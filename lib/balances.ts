import { calendarKey } from "./due-dates";

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
  note?: string | null;
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

/**
 * The statement day starts the new cycle. Spend from that day until the next
 * statement is the bill due after the next statement (pay it early anytime).
 * Spend before that day is the previous bill.
 * ponytail: a payment is tied with note `cycle:YYYY-MM-DD`. Untagged payments
 * in the current cycle count as early payments on that cycle.
 */
export function cardBillParts(
  cardId: string,
  prevStatement: Date,
  statementDate: Date,
  nextStatement: Date,
  expenses: BalExpense[],
  moves: BalMove[]
) {
  const prevKey = calendarKey(prevStatement);
  const statementKey = calendarKey(statementDate);
  const nextKey = calendarKey(nextStatement);
  const closedEvents: { at: number; amount: number; pay: boolean }[] = [];
  const openEvents: { at: number; amount: number; pay: boolean }[] = [];
  for (const r of expenses) {
    if (r.type !== "DEBIT" || r.paymentMethod !== "CC" || r.cardId !== cardId) {
      continue;
    }
    if (!r.createdAt) continue;
    const key = calendarKey(r.createdAt);
    const ev = { at: r.createdAt.getTime(), amount: r.amount, pay: false };
    if (key >= prevKey && key < statementKey) closedEvents.push(ev);
    else if (key >= statementKey && key < nextKey) openEvents.push(ev);
  }
  for (const m of moves) {
    if (m.cardId !== cardId) continue;
    const tagged = m.note?.startsWith("cycle:") ? m.note.slice(6) : null;
    const ev = {
      at: m.createdAt?.getTime() ?? 0,
      amount: m.amount,
      pay: true,
    };
    if (tagged === prevKey) closedEvents.push(ev);
    else if (tagged === statementKey) openEvents.push(ev);
    else if (m.createdAt) {
      const key = calendarKey(m.createdAt);
      if (key >= statementKey && key < nextKey) openEvents.push(ev);
      else if (key >= prevKey && key < statementKey) closedEvents.push(ev);
    }
  }
  const closed = settle(closedEvents);
  const open = settle(openEvents);
  return {
    closed: closed.owed,
    open: open.owed,
    closedPaid: closed.paid,
    openPaid: open.paid,
    closedKey: prevKey,
    openKey: statementKey,
  };
}

/** A payment clears the bill so far. A swipe after that payment is still due. */
function settle(events: { at: number; amount: number; pay: boolean }[]) {
  events.sort((a, b) => a.at - b.at || Number(a.pay) - Number(b.pay));
  let bal = 0;
  let paid = 0;
  for (const e of events) {
    if (e.pay) {
      paid += e.amount;
      bal = Math.max(0, bal - e.amount);
    } else bal += e.amount;
  }
  return { owed: roundMoney(bal), paid: roundMoney(paid) };
}
