# Finance App Shell — Design Spec

**Date:** 2026-10-26  
**Status:** Draft for review  
**App:** expense-tracker (Next.js + Prisma + NextAuth + PostgreSQL)

## Goal

Rebuild the single-page expense tracker into a small personal finance shell with fast entry, Cash/UPI/CC tracking (named cards), a credit/debit ledger with hybrid balance rules, budgets, search/filters, edit/delete, and one-tap repeat.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Architecture | Multi-page finance shell (not extend-in-place only) |
| Ledger | Each entry is CREDIT or DEBIT; balance = credits − relevant debits |
| CC vs balance | Hybrid: main balance ignores CC; each card shows its own monthly spend |
| Cards | Managed list in settings (add once, pick when paying by CC) |
| Scope | Full set: core money features + edit/delete, quick amounts, spent today, budgets, search/filters |
| Existing data migration | `type = DEBIT`, `paymentMethod = CASH`, `cardId = null` |
| Budget months | Editing current month only; when a new month starts, auto-copy last month’s budget amounts |

## App structure

Four areas with a mobile-friendly bottom nav (desktop: same nav, wider layout):

| Page | Responsibility |
|------|----------------|
| **Dashboard** | Spent today, main balance, month overview, per-card CC spend, budget progress, recent 5 + Repeat |
| **Add** | Primary fast-entry surface |
| **Activity** | Full list, search, filters, edit / delete / repeat |
| **More** | Credit cards, monthly budgets, account/settings, optional reset tools |

Stack unchanged: Next.js App Router, Prisma, NextAuth, PostgreSQL. Prefer shadcn UI + lucide icons; relative imports in app code.

## Data model

### `CreditCard`

- `id`, `userId`, `name`, `last4` (optional), `isActive` (default true), `createdAt`
- Soft-deactivate preferred over hard delete when history exists

### `Budget`

- `id`, `userId`, `category` (`CategoryType`), `amount` (Float), `month` (`YYYY-MM` string)
- Unique: `(userId, category, month)`

### `Expense` (transaction row; table may keep name `Expense` or rename to `Transaction`)

| Field | Notes |
|-------|--------|
| `id`, `userId`, `title`, `amount`, `createdAt` | Existing |
| `category` | Existing `CategoryType` enum |
| `type` | `CREDIT` \| `DEBIT` |
| `paymentMethod` | `CASH` \| `UPI` \| `CC`; required for DEBIT; null for CREDIT |
| `cardId` | Optional FK → `CreditCard`; **required when** `paymentMethod = CC` |

### Balance rules

- **Main balance** = `sum(CREDIT)` − `sum(DEBIT where paymentMethod in CASH, UPI)` (all-time by default; Dashboard may offer a this-month view of the same formula)
- **Per-card monthly spend** = `sum(DEBIT where paymentMethod = CC and cardId = X)` for the selected month
- CC debits never change main balance
- No stored running balance; always derived from rows

### Migration

Existing expenses become:

- `type = DEBIT`
- `paymentMethod = CASH`
- `cardId = null`

## Entry UX (Add page)

Amount-first flow:

1. Large amount input (focus on load)
2. Quick amount chips: 20 · 50 · 100 · 200 · 500
3. Credit / Debit toggle (default Debit)
4. Title field + common title chips (auto-set category)
5. Payment method (Debit only): Cash · UPI · CC  
   - CC → show active cards; block save if none configured
6. Category chips
7. Save → stay on Add; clear amount/title; **keep last payment method** (and last card if CC)

**Repeat:** from Activity rows and Dashboard recent strip — clone title, amount, category, type, paymentMethod, cardId as a new row with `createdAt = now` (today). Confirm with a short toast.

**Edit / delete:** from Activity (edit sheet; delete with confirm).

## Dashboard

- Spent today (all DEBIT today: Cash + UPI + CC)
- Main balance (hybrid rule above)
- This month: credited · spent (Cash/UPI) · CC total
- Cards strip: each active card → spend this month
- Budget bars for categories that have a budget this month
- Recent 5 with Repeat

## Activity

- Chronological credit + debit list
- Search by title
- Filters: type, method, card, category, date range (week / month / custom)
- Row: title, signed amount color, method badge, card name if CC, category, date
- Actions: Repeat · Edit · Delete

## More

- CRUD-ish for cards: add, rename, deactivate
- Monthly budgets per category; new month auto-copies previous month’s amounts
- Place for existing reset tooling if retained

## APIs

| Endpoint | Role |
|----------|------|
| `GET/POST /api/expenses` | List/create with new fields |
| `PATCH/DELETE /api/expenses/[id]` | Update / delete |
| `GET/POST /api/cards` | List / create cards |
| `PATCH/DELETE /api/cards/[id]` | Update / deactivate (prefer deactivate) |
| `GET/PUT /api/budgets` | Read/upsert budgets for a month (`?month=YYYY-MM`) |
| `GET /api/summary` | Dashboard payload: today spent, main balance, month totals, per-card spend, budget progress |

Auth: all routes require NextAuth session; scope by user email/id as today.

### Validation

- DEBIT + CC without `cardId` → 400
- CREDIT → persist `paymentMethod` / `cardId` as null
- Amount must be positive number
- Deactivated cards remain on historical rows; omitted from Add picker

## UI / routing sketch

- `/` → Dashboard (or redirect)
- `/add` → Add
- `/activity` → Activity
- `/more` → More (cards + budgets subsections or nested routes `/more/cards`, `/more/budgets`)
- Shared bottom nav layout

## Out of scope (this redesign)

- Bank sync, OCR receipts, multi-currency, shared households, bill reminders, CC statement import

## Success criteria

- Add a typical debit in ≤ a few taps (amount + chip + method + save)
- Repeat yesterday’s snack as today’s expense in one tap
- Main balance never changes when logging CC spend; card monthly totals do
- User can define cards once and pick them on CC payments
- Budgets and Activity search/filters work for day-to-day review

## Implementation note

After this spec is approved, produce a phased implementation plan (schema/migration → APIs → shell nav → Add → Dashboard/summary → Activity → More/cards/budgets → polish). Do not start coding until the plan exists and is accepted.
