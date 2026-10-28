"use client";

import { signOut } from "next-auth/react";
import AccountsManager from "../../../components/more/AccountsManager";
import InvestmentsManager from "../../../components/more/InvestmentsManager";
import CardsManager from "../../../components/more/CardsManager";
import BudgetsManager from "../../../components/more/BudgetsManager";
import RecurringManager from "../../../components/more/RecurringManager";
import SavingsGoalForm from "../../../components/more/SavingsGoalForm";
import ThemeToggle from "../../../components/ThemeToggle";
import { Button } from "../../../components/ui/button";

export default function MorePage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 md:text-3xl">
          More
        </h1>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Accounts, investments, cards, recurring, budgets, savings.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-stone-200 bg-white/90 p-4 dark:border-stone-700 dark:bg-stone-900/90">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          Appearance
        </h2>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Light, dark, or follow your device.
        </p>
        <ThemeToggle />
      </section>

      <AccountsManager />
      <InvestmentsManager />

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <RecurringManager />
        <SavingsGoalForm />
        <CardsManager />
        <BudgetsManager />
      </div>

      <section className="rounded-xl border border-stone-200 bg-white/90 p-4 dark:border-stone-700 dark:bg-stone-900/90 md:max-w-md">
        <h2 className="mb-3 text-lg font-semibold text-stone-900 dark:text-stone-100">
          Account
        </h2>
        <Button
          type="button"
          variant="outline"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Sign out
        </Button>
      </section>
    </div>
  );
}
