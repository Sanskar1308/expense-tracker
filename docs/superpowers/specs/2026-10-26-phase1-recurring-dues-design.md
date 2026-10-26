# Phase 1 — Recurring Dues, CC Cycle, Compare, Savings, Undo

**Date:** 2026-10-26  
**Status:** Draft for review  
**App:** expense-tracker

## Goal

Add pending-based recurrings (EMI/OTT/rent), credit-card statement/due visibility, week/month period compare, one savings goal tied to main balance, and undo toasts — without auto-posting to the ledger until the user marks Paid.

## Locked decisions

| Topic | Choice |
|-------|--------|
| Pending behavior | List + Home badge; ledger unchanged until Paid |
| EMI months | Optional `totalMonths`; null = open-ended; show `paidCount / totalMonths` |
| Savings | One goal; progress = main balance (Cash/UPI credits − Cash/UPI debits) |
| CC cycle | Statement day + due day; owed = that card’s CC spend in current cycle |
| CC “pay bill” pending | Phase 1 = visibility only (no separate bill-pay pending) |
| Build order | Phase 1 = this spec; Phase 2 = dark mode + PWA |
| Architecture | `RecurringRule` + `PendingPayment` tables (not draft Expenses) |

## Phase 2 (out of scope here)

- Dark mode
- PWA / home-screen quick widget

---

## Data model

### `RecurringRule`

| Field | Notes |
|-------|--------|
| `id`, `userId` | |
| `title`, `amount`, `category` | Snapshot source for pendings |
| `type` | Default `DEBIT` |
| `paymentMethod`, `cardId?` | Same rules as expenses (CC needs card) |
| `payee` | Optional “to whom” |
| `cadence` | `MONTHLY` in v1 |
| `dayOfMonth` | 1–28 (clamp end-of-month) |
| `totalMonths` | Optional; EMI tenure |
| `isActive` | Pause/resume |
| `startDate` | First eligible cycle |
| `createdAt` | |

Paid count for EMI is derived from `PendingPayment` with `status = PAID` for that rule (or maintained on mark Paid / undo).

### `PendingPayment`

| Field | Notes |
|-------|--------|
| `id`, `userId`, `ruleId` | |
| Snapshot fields | title, amount, category, type, paymentMethod, cardId, payee |
| `dueDate` | Date |
| `status` | `PENDING` \| `PAID` \| `SKIPPED` |
| `expenseId` | Set when Paid |
| Unique | `(ruleId, dueDate)` for idempotent generation |

### `CreditCard` extensions

- `statementDay` Int? (1–28)
- `dueDay` Int? (1–28)

**Current cycle:** from last occurrence of `statementDay` (≤ today) through now.  
**Owed:** sum of DEBIT + `paymentMethod = CC` + that `cardId` with `createdAt` in cycle.  
**Due date:** next `dueDay` on/after statement (handle month rollover).

### `SavingsGoal`

- One row per user (upsert): `title?`, `targetAmount`, `deadline`
- Progress display: `mainBalance / targetAmount`

### Undo

- Client-held last action (~8s); no durable undo log required for v1
- Supported: undo expense delete; undo pending Paid (delete expense, revert pending, adjust EMI count)

---

## Behavior

### Pending generation

On summary / dues fetch (authenticated):

1. For each active rule, compute due date(s) for current cycle and any missed unpaid cycles since `startDate` (cap lookback, e.g. 3 months).
2. Upsert `PendingPayment` with status `PENDING` if missing.
3. If `totalMonths` set and paid count ≥ total, set rule `isActive = false` and stop generating.

### Mark Paid

1. Validate pending owned + `PENDING`
2. Prompt for payment date: default **Today**, or **Change date** (any `YYYY-MM-DD`; picker starts at due date)
3. Create `Expense` from snapshot with `createdAt` = chosen date (`paidAt` body; omit → now)
4. Set `expenseId`, status `PAID`
5. If EMI complete → deactivate rule

### Skip

Set status `SKIPPED` for that cycle only; next month still generates.

### Home badge

Count of pendings with `status = PENDING` and `dueDate <= today + 3 days`, plus optional CC cards with due within 3 days.

### Period compare

Dashboard toggle Week | Month:

- This period vs previous period total DEBIT
- Top category deltas / % change

### Savings

Dashboard card + edit in More; progress from existing main-balance formula.

---

## UI / routes

| Surface | Role |
|---------|------|
| Dashboard | Badge, due preview, CC owed strip, compare toggle, savings progress |
| `/dues` or Dashboard section | Full pending list — Paid / Skip |
| More → Recurring | CRUD rules (incl. payee, optional months) |
| More → Cards | statementDay, dueDay |
| More → Savings | edit goal |
| Activity | Undo on delete |

Nav: add **Dues** entry or badge on Home only (prefer Home section + `/dues` link to avoid nav clutter; badge on Home).

---

## APIs (sketch)

- `GET/POST /api/recurring` · `PATCH/DELETE /api/recurring/[id]`
- `GET /api/pendings` (generates missing) · `POST /api/pendings/[id]/pay` · `POST /api/pendings/[id]/skip` · `POST /api/pendings/[id]/undo-pay`
- `PATCH /api/cards/[id]` — accept statementDay, dueDay
- `GET/PUT /api/savings-goal`
- Extend `GET /api/summary` — `duesBadge`, `cardBills[]`, `compare`, `savings`

---

## Success criteria

- OTT/rent: open-ended monthly pending until Paid; no silent ledger entries
- EMI: optional N months, progress `k/N`, auto-stop after N Paids
- Payee visible on rules and pendings
- CC strip shows cycle owed + due date when days configured
- Week and month compare on Dashboard
- One savings goal tracks main balance
- Undo works for delete and Paid within toast window

## Implementation note

After spec approval → writing-plans → implement Phase 1 only.
