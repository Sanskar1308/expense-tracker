"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { formatRupee } from "../../lib/utils";
import { apiSend } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import { useSavingsGoal } from "../../hooks/useFinanceQueries";

export default function SavingsGoalForm() {
  const { data } = useSavingsGoal();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!data) return;
    if (data.goal) {
      setTitle(data.goal.title ?? "");
      setTarget(String(data.goal.targetAmount));
      setDeadline(data.goal.deadline.slice(0, 10));
    }
  }, [data]);

  const mainBalance = data?.mainBalance ?? 0;
  const progress = data?.progress ?? 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await apiSend("/api/savings-goal", "PUT", {
        title: title || null,
        targetAmount: parseFloat(target),
        deadline,
      });
      setMessage("Saved");
      await qc.invalidateQueries({ queryKey: queryKeys.savingsGoal });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-stone-200 bg-white/90 p-4 dark:border-stone-700 dark:bg-stone-900/90">
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
        Savings goal
      </h2>
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Progress uses your main balance (Cash/UPI).
      </p>
      {target && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>
              {formatRupee(mainBalance)} /{" "}
              {formatRupee(parseFloat(target) || 0)}
            </span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}
      <form onSubmit={save} className="space-y-2">
        <div>
          <Label>Title (optional)</Label>
          <Input
            className="mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Emergency fund"
          />
        </div>
        <div>
          <Label>Target amount</Label>
          <Input
            className="mt-1"
            type="number"
            min="1"
            step="1"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Deadline</Label>
          <Input
            className="mt-1"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />
        </div>
        {message && <p className="text-sm text-emerald-700">{message}</p>}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save goal"}
        </Button>
      </form>
    </section>
  );
}
