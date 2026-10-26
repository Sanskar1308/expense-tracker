# Phase 1 Recurring Dues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship pending-based recurrings (EMI/OTT), CC statement/due visibility, week/month compare, one savings goal, and undo toasts.

**Architecture:** Add `RecurringRule`, `PendingPayment`, `SavingsGoal`; extend `CreditCard`. Generate pendings on fetch; Paid creates an Expense. Extend `/api/summary` for badges, bills, compare, savings. UI: `/dues`, More managers, Dashboard widgets, undo toast.

**Tech Stack:** Next.js 15, Prisma, PostgreSQL, NextAuth, Tailwind, shadcn-style UI, lucide-react

**Spec:** `docs/superpowers/specs/2026-10-26-phase1-recurring-dues-design.md`

## Global Constraints

- Relative imports in new app/lib/components files
- shadcn UI + lucide icons
- Never auto-post ledger until Paid
- EMI: optional `totalMonths`; progress from PAID pendings
- Savings progress = main balance
- Phase 2 (dark/PWA) out of scope
- No Co-authored-by trailers in commits if controllable

## File map

| Path | Role |
|------|------|
| `prisma/schema.prisma` | New models + card days |
| `lib/dues.ts` | due dates, pending generate, CC cycle, compare |
| `app/api/recurring/*` | CRUD rules |
| `app/api/pendings/*` | list/generate, pay, skip, undo-pay |
| `app/api/savings-goal/route.ts` | GET/PUT |
| `app/api/summary/route.ts` | extend payload |
| `app/api/cards/[id]/route.ts` | statementDay/dueDay |
| `app/(app)/dues/page.tsx` | pending list |
| `components/more/RecurringManager.tsx` | rules CRUD |
| `components/more/SavingsGoalForm.tsx` | goal edit |
| `components/UndoToast.tsx` | shared undo |
| Dashboard / Activity / CardsManager / BottomNav | wire UI |

---

### Task 1: Schema + dues helpers

- [ ] Update Prisma: enums `PendingStatus`, `RecurringCadence`; models; card fields; User relations; Expense optional reverse link from Pending
- [ ] Migrate + generate
- [ ] Add `lib/dues.ts`: `clampDay`, `dateOnOrBefore`, `nextDueDates`, `ensurePendings`, `cardCycle`, `buildCompare`
- [ ] Commit: `feat: add recurring/pending/savings schema and dues helpers`

### Task 2: APIs

- [ ] Recurring CRUD
- [ ] Pendings GET (ensure) + pay/skip/undo-pay
- [ ] Savings goal GET/PUT
- [ ] Cards PATCH days; summary extensions
- [ ] Commit: `feat: add recurring, pendings, savings, and summary dues APIs`

### Task 3: Dues page + Recurring/Savings/Cards UI

- [ ] `/dues` with Paid/Skip + undo
- [ ] More: RecurringManager, SavingsGoalForm; CardsManager days
- [ ] Commit: `feat: add dues page and recurring/savings management UI`

### Task 4: Dashboard + Activity undo + nav badge

- [ ] Dashboard: dues preview, CC bills, compare toggle, savings card
- [ ] Activity delete undo toast
- [ ] Home nav badge count optional
- [ ] Commit: `feat: wire dashboard dues, compare, savings, and undo`

### Task 5: Verify

- [ ] `npm run build`
- [ ] Manual checklist vs spec success criteria
