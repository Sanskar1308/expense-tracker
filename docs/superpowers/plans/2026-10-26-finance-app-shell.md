# Finance App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the expense tracker into a multi-page finance shell with Cash/UPI/CC (named cards), credit/debit ledger, hybrid balance, budgets, search/filters, edit/delete, and repeat-for-today.

**Architecture:** Keep Next.js App Router + Prisma + NextAuth. Extend `Expense` with ledger/payment fields; add `CreditCard` and `Budget`. Split UI into Dashboard / Add / Activity / More with shared bottom nav. Derive balances in `/api/summary` (never store running balance).

**Tech Stack:** Next.js 15, React 19, Prisma 6, PostgreSQL, NextAuth 4, Tailwind 4, shadcn/ui, lucide-react

**Spec:** `docs/superpowers/specs/2026-10-26-finance-app-shell-design.md`

## Global Constraints

- Relative imports in new `.ts`/`.tsx` files (no new `@/` in files we create; existing files may keep `@/` until touched)
- Use shadcn UI components (exception: tables may be plain HTML)
- Icons from `lucide-react` only
- Existing expenses migrate to `DEBIT` + `CASH`
- Main balance ignores CC; CC tracked per-card monthly
- CREDIT rows store `paymentMethod` and `cardId` as null
- Prefer soft-deactivate cards over hard delete when history exists
- Auto-copy prior month budgets when opening a new month with none set

## File map

| Path | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | Enums + CreditCard + Budget + Expense fields |
| `lib/prisma.ts` | Shared PrismaClient singleton |
| `lib/money.ts` | Pure helpers: month key, balance math, validation |
| `lib/session-user.ts` | Resolve authenticated Prisma user from session |
| `app/api/expenses/route.ts` | GET list (query filters), POST create |
| `app/api/expenses/[id]/route.ts` | PATCH, DELETE |
| `app/api/expenses/repeat/route.ts` | POST clone for today |
| `app/api/cards/route.ts` | GET, POST |
| `app/api/cards/[id]/route.ts` | PATCH (rename/deactivate) |
| `app/api/budgets/route.ts` | GET, PUT (+ auto-copy) |
| `app/api/summary/route.ts` | Dashboard aggregates |
| `components/ui/*` | shadcn primitives |
| `components/BottomNav.tsx` | App shell nav |
| `components/TransactionRow.tsx` | Shared list row + actions |
| `app/(app)/layout.tsx` | Authenticated shell + bottom nav |
| `app/(app)/page.tsx` | Dashboard |
| `app/(app)/add/page.tsx` | Fast entry |
| `app/(app)/activity/page.tsx` | List + search/filters |
| `app/(app)/more/page.tsx` | Cards + budgets + reset entry |
| `app/page.tsx` | Remove old monolith (replaced by `(app)/page.tsx`) |

---

### Task 1: Schema + Prisma client + money helpers

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `lib/prisma.ts`, `lib/money.ts`, `lib/session-user.ts`
- Create migration via `npx prisma migrate dev`

**Interfaces:**
- Produces: `getMonthKey(d?: Date): string`, `assertTransactionInput(input)`, `computeMainBalance(rows)`, Prisma models `CreditCard`, `Budget`, updated `Expense`
- Consumes: existing `User`, `CategoryType`

- [ ] **Step 1: Update Prisma schema**

Add enums and models; extend Expense:

```prisma
enum TransactionType {
  CREDIT
  DEBIT
}

enum PaymentMethod {
  CASH
  UPI
  CC
}

model CreditCard {
  id        String   @id @default(cuid())
  name      String
  last4     String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expenses  Expense[]
}

model Budget {
  id       String       @id @default(cuid())
  amount   Float
  month    String
  category CategoryType
  userId   String
  user     User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, category, month])
}

// On Expense add:
type          TransactionType @default(DEBIT)
paymentMethod PaymentMethod?
cardId        String?
card          CreditCard?     @relation(fields: [cardId], references: [id])
```

Also add `creditCards CreditCard[]` and `budgets Budget[]` on `User`.

- [ ] **Step 2: Write SQL migration that backfills existing rows**

In the migration SQL after adding columns (nullable first if needed), set:

```sql
UPDATE "Expense" SET "type" = 'DEBIT', "paymentMethod" = 'CASH' WHERE "paymentMethod" IS NULL;
```

Then enforce DEBIT requires paymentMethod at app layer (DB may keep paymentMethod nullable for CREDIT).

- [ ] **Step 3: Add `lib/prisma.ts` singleton and `lib/money.ts`**

```ts
// lib/money.ts
export type TxRow = {
  type: "CREDIT" | "DEBIT";
  amount: number;
  paymentMethod: "CASH" | "UPI" | "CC" | null;
  cardId: string | null;
  createdAt: Date;
  category: string;
};

export function getMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function computeMainBalance(rows: TxRow[]): number {
  let credits = 0;
  let debits = 0;
  for (const r of rows) {
    if (r.type === "CREDIT") credits += r.amount;
    else if (r.paymentMethod === "CASH" || r.paymentMethod === "UPI") debits += r.amount;
  }
  return credits - debits;
}

export function validateTransactionPayload(body: {
  title?: string;
  amount?: number;
  category?: string;
  type?: string;
  paymentMethod?: string | null;
  cardId?: string | null;
}): string | null {
  if (!body.title?.trim()) return "Title required";
  if (body.amount == null || !(Number(body.amount) > 0)) return "Positive amount required";
  if (!body.category) return "Category required";
  if (body.type !== "CREDIT" && body.type !== "DEBIT") return "Invalid type";
  if (body.type === "DEBIT") {
    if (!body.paymentMethod || !["CASH", "UPI", "CC"].includes(body.paymentMethod)) {
      return "Payment method required for debit";
    }
    if (body.paymentMethod === "CC" && !body.cardId) return "Card required for CC";
  }
  return null;
}
```

- [ ] **Step 4: Add `lib/session-user.ts`**

```ts
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email } });
}
```

Refactor `lib/auth.ts` to import `prisma` from `./prisma` (stop creating a second client).

- [ ] **Step 5: Run migrate + generate**

Run: `npx prisma migrate dev --name finance_shell`

Expected: migration applied, client generated.

- [ ] **Step 6: Commit**

```bash
git add prisma lib/prisma.ts lib/money.ts lib/session-user.ts lib/auth.ts
git commit -m "feat: extend schema for ledger, cards, and budgets"
```

---

### Task 2: Transaction + cards + budgets + summary APIs

**Files:**
- Modify: `app/api/expenses/route.ts`
- Create: `app/api/expenses/[id]/route.ts`, `app/api/expenses/repeat/route.ts`
- Create: `app/api/cards/route.ts`, `app/api/cards/[id]/route.ts`
- Create: `app/api/budgets/route.ts`, `app/api/summary/route.ts`
- Keep: `app/api/expenses/reset/route.ts` (wire later from More)

**Interfaces:**
- Consumes: `requireUser`, `validateTransactionPayload`, `getMonthKey`, `computeMainBalance`
- Produces: REST endpoints per spec

- [ ] **Step 1: Rewrite `GET/POST /api/expenses`**

GET supports query: `q`, `type`, `paymentMethod`, `cardId`, `category`, `from`, `to` (ISO dates).  
POST: validate; for CREDIT force `paymentMethod=null`, `cardId=null`; create row.

- [ ] **Step 2: Add PATCH/DELETE `/api/expenses/[id]`**

Ownership check via `userId`. Same validation on PATCH.

- [ ] **Step 3: Add POST `/api/expenses/repeat`**

Body: `{ id: string }`. Load owned expense; create clone with `createdAt: new Date()` and same type/method/card/category/title/amount.

- [ ] **Step 4: Cards API**

- GET: all cards for user (include inactive for history labels; Add UI filters `isActive`)
- POST: `{ name, last4? }`
- PATCH `[id]`: `{ name?, last4?, isActive? }` — prefer deactivate (`isActive: false`)

- [ ] **Step 5: Budgets API**

- GET `?month=YYYY-MM` (default current): if no budgets for month, copy from previous month (latest month `<` requested that has rows), then return.
- PUT body: `{ month, items: [{ category, amount }] }` upsert each.

- [ ] **Step 6: Summary API**

Return JSON:

```ts
{
  spentToday: number;
  mainBalance: number;
  month: {
    credited: number;
    spentCashUpi: number;
    spentCc: number;
  };
  cards: { id: string; name: string; spentThisMonth: number }[];
  budgets: { category: string; limit: number; spent: number }[];
  recent: Expense[]; // last 5 with card include
}
```

Spent today = all DEBIT today (any method). Budget `spent` = DEBIT in month for that category (all methods).

- [ ] **Step 7: Smoke-check TypeScript**

Run: `npx tsc --noEmit`  
Expected: no errors in new API files.

- [ ] **Step 8: Commit**

```bash
git add app/api
git commit -m "feat: add finance APIs for transactions, cards, budgets, summary"
```

---

### Task 3: UI foundation (shadcn, lucide, shell layout)

**Files:**
- Create: `components.json`, `lib/utils.ts`, `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/badge.tsx`, `components/ui/card.tsx`, `components/ui/tabs.tsx`, `components/ui/dialog.tsx`, `components/ui/select.tsx`, `components/ui/progress.tsx`, `components/ui/toast`-related as needed
- Create: `components/BottomNav.tsx`
- Create: `app/(app)/layout.tsx`
- Modify: `app/layout.tsx` (remove old Navbar from root or keep login-only)
- Modify: `components/Navbar.tsx` (login/logout only, or fold into shell)

- [ ] **Step 1: Install deps**

Run:

```bash
npm install lucide-react class-variance-authority clsx tailwind-merge @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-label @radix-ui/react-select @radix-ui/react-progress
```

Add `lib/utils.ts` with `cn()` helper. Add minimal shadcn-style button/input/badge/card/tabs/dialog/progress components (hand-rolled to match shadcn patterns if CLI not available).

- [ ] **Step 2: Bottom nav**

Links: `/` Dashboard, `/add` Add, `/activity` Activity, `/more` More — lucide icons `LayoutDashboard`, `PlusCircle`, `List`, `Menu`.

- [ ] **Step 3: `(app)` layout**

Client session gate: if unauthenticated, redirect to `/login`. Render children + `BottomNav`. Max width container.

- [ ] **Step 4: Root layout**

Keep AuthProvider; use Navbar only on login or slim header with sign-out in More.

- [ ] **Step 5: Commit**

```bash
git add components app/layout.tsx app/(app) package.json package-lock.json lib/utils.ts
git commit -m "feat: add UI shell with bottom navigation"
```

---

### Task 4: Add page (fast entry)

**Files:**
- Create: `app/(app)/add/page.tsx`
- Create: `components/add/AddTransactionForm.tsx`

- [ ] **Step 1: Build form per spec**

Amount-first, quick chips 20/50/100/200/500, Credit/Debit, title + common chips, payment (debit only), card picker, category, save via POST `/api/expenses`. Persist last `paymentMethod` + `cardId` in `localStorage`.

- [ ] **Step 2: Load active cards from GET `/api/cards`**

If CC selected and no active cards, show link to More and disable save.

- [ ] **Step 3: Manual verify**

Run: `npm run dev` — add debit Cash, debit CC (after creating a card), credit; confirm stay-on-page and cleared amount.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/add components/add
git commit -m "feat: add fast transaction entry page"
```

---

### Task 5: Dashboard

**Files:**
- Create: `app/(app)/page.tsx` (move/replace old `app/page.tsx`)
- Delete or redirect old monolith `app/page.tsx` content into `(app)` route group carefully (Next.js: `app/(app)/page.tsx` serves `/`)

- [ ] **Step 1: Fetch `/api/summary` and render widgets**

Spent today, main balance, month strip, cards strip, budget progress bars, recent 5 with Repeat → POST `/api/expenses/repeat`.

- [ ] **Step 2: Remove obsolete monolith components from old page**

Ensure no duplicate `/` page files.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/page.tsx app/page.tsx components
git commit -m "feat: add dashboard with hybrid balance and budgets"
```

---

### Task 6: Activity (search, filters, edit, delete, repeat)

**Files:**
- Create: `app/(app)/activity/page.tsx`
- Create: `components/activity/ActivityFilters.tsx`
- Create: `components/TransactionRow.tsx`
- Create: `components/activity/EditTransactionDialog.tsx`

- [ ] **Step 1: List + filters** calling GET `/api/expenses` with query params

- [ ] **Step 2: Row actions** Repeat / Edit (PATCH) / Delete (DELETE with confirm)

- [ ] **Step 3: Commit**

```bash
git add app/(app)/activity components/activity components/TransactionRow.tsx
git commit -m "feat: add activity feed with search, filters, and edit"
```

---

### Task 7: More (cards, budgets, reset)

**Files:**
- Create: `app/(app)/more/page.tsx`
- Create: `components/more/CardsManager.tsx`
- Create: `components/more/BudgetsManager.tsx`
- Wire existing reset API if still desired

- [ ] **Step 1: Cards manager** — add name/last4, rename, deactivate

- [ ] **Step 2: Budgets manager** — load GET `/api/budgets`, edit amounts per category, PUT save for current month

- [ ] **Step 3: Sign out + optional reset UI**

- [ ] **Step 4: Commit**

```bash
git add app/(app)/more components/more
git commit -m "feat: add cards and budgets management"
```

---

### Task 8: Polish + verify

- [ ] **Step 1: Metadata title** → "Expense Tracker" in root layout

- [ ] **Step 2: Run `npm run lint` and `npm run build`**

Fix any errors. Expected: build succeeds.

- [ ] **Step 3: Spec checklist**

Confirm: Cash/UPI/CC + card picker, credit/debit, hybrid balance, repeat, edit/delete, budgets, search/filters, migration default Cash.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: polish finance shell and fix build"
```

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Multi-page shell | 3 |
| Schema CreditCard/Budget/Expense fields | 1 |
| Migration DEBIT+CASH | 1 |
| Hybrid balance + summary | 2, 5 |
| Add UX + quick amounts + remember method | 4 |
| Repeat | 2, 5, 6 |
| Activity search/filters/edit/delete | 6 |
| Cards + budgets in More + auto-copy | 2, 7 |
| shadcn + lucide | 3 |
