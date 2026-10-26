"use client";

import { signIn } from "next-auth/react";
import { Button } from "../../components/ui/button";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-stone-200 bg-white/90 dark:border-stone-700 dark:bg-stone-900/90 p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 ">
            Expense Tracker
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-400 ">
            Cash, UPI, and cards in one ledger.
          </p>
        </div>
        <div className="space-y-2">
          <Button className="w-full" size="lg" onClick={() => signIn("github", { callbackUrl: "/" })}>
            Sign in with GitHub
          </Button>
          <Button
            className="w-full"
            size="lg"
            variant="outline"
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            Sign in with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
