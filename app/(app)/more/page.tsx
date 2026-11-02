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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";

const TABS = [
  { value: "accounts", label: "Accounts" },
  { value: "investments", label: "Investments" },
  { value: "cards", label: "Cards" },
  { value: "recurring", label: "Recurring" },
  { value: "budgets", label: "Budgets" },
  { value: "savings", label: "Savings" },
  { value: "settings", label: "Settings" },
] as const;

export default function MorePage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 md:text-3xl">
          More
        </h1>
      </header>

      <Tabs defaultValue="accounts">
        <TabsList className="w-full">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="accounts">
          <AccountsManager />
        </TabsContent>
        <TabsContent value="investments">
          <InvestmentsManager />
        </TabsContent>
        <TabsContent value="cards">
          <CardsManager />
        </TabsContent>
        <TabsContent value="recurring">
          <RecurringManager />
        </TabsContent>
        <TabsContent value="budgets">
          <BudgetsManager />
        </TabsContent>
        <TabsContent value="savings">
          <SavingsGoalForm />
        </TabsContent>
        <TabsContent value="settings" className="space-y-4">
          <section className="space-y-3 rounded-xl border border-stone-200 bg-white/90 p-4 dark:border-stone-700 dark:bg-stone-900/90">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              Appearance
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Light, dark, or follow your device.
            </p>
            <ThemeToggle />
          </section>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
