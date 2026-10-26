"use client";

import { signOut } from "next-auth/react";
import CardsManager from "../../../components/more/CardsManager";
import BudgetsManager from "../../../components/more/BudgetsManager";
import { Button } from "../../../components/ui/button";

export default function MorePage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900 md:text-3xl">
          More
        </h1>
        <p className="text-sm text-stone-600">Cards, budgets, and account.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <CardsManager />
        <BudgetsManager />
      </div>

      <section className="rounded-xl border border-stone-200 bg-white/90 p-4 md:max-w-md">
        <h2 className="mb-3 text-lg font-semibold text-stone-900">Account</h2>
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
