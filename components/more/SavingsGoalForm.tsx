"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { formatRupee } from "../../lib/utils";
import { apiSend } from "../../lib/api-client";
import type { SavingsGoalRow } from "../../lib/types";
import { useInvalidateMoney, useSavingsGoal } from "../../hooks/useFinanceQueries";

export default function SavingsGoalForm() {
  const { data } = useSavingsGoal();
  const invalidate = useInvalidateMoney();
  const goals = data?.goals ?? [];

  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [deadline, setDeadline] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await apiSend("/api/savings-goal", "POST", {
        title: title || null,
        targetAmount: parseFloat(target),
        savedAmount: saved === "" ? 0 : parseFloat(saved),
        deadline,
      });
      setTitle("");
      setTarget("");
      setSaved("");
      setDeadline("");
      setMessage("Goal added");
      await invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-stone-200 bg-white/90 p-4 dark:border-stone-700 dark:bg-stone-900/90">
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
        Savings goals
      </h2>
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Each goal tracks how much you have set aside. Update the saved amount
        yourself.
      </p>

      <ul className="space-y-3">
        {goals.map((g) => (
          <GoalRow key={g.id} goal={g} onChange={invalidate} />
        ))}
      </ul>

      <form onSubmit={add} className="space-y-2 border-t border-stone-100 pt-3 dark:border-stone-800">
        <div>
          <Label>Title</Label>
          <Input
            className="mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Emergency fund"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Target</Label>
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
            <Label>Saved so far</Label>
            <Input
              className="mt-1"
              type="number"
              min="0"
              step="1"
              value={saved}
              onChange={(e) => setSaved(e.target.value)}
              placeholder="0"
            />
          </div>
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
        <Button type="submit">Add goal</Button>
      </form>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}

function GoalRow({
  goal,
  onChange,
}: {
  goal: SavingsGoalRow;
  onChange: () => Promise<unknown>;
}) {
  const [saved, setSaved] = useState(String(goal.savedAmount));

  async function saveSaved() {
    await apiSend(`/api/savings-goal/${goal.id}`, "PATCH", {
      savedAmount: parseFloat(saved),
    });
    await onChange();
  }

  async function remove() {
    if (!confirm(`Delete ${goal.title || "this goal"}?`)) return;
    await apiSend(`/api/savings-goal/${goal.id}`, "DELETE");
    await onChange();
  }

  const daysLeft = Math.ceil(
    (new Date(goal.deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  );

  return (
    <li className="space-y-2">
      <div className="flex items-start justify-between gap-2 text-sm">
        <span className="font-medium">{goal.title || "Savings goal"}</span>
        <button type="button" className="text-xs text-stone-500" onClick={remove}>
          Delete
        </button>
      </div>
      <div className="flex justify-between text-xs text-stone-500">
        <span>
          {formatRupee(goal.savedAmount)} / {formatRupee(goal.targetAmount)}
        </span>
        <span>
          {goal.progress.toFixed(0)}% · {daysLeft}d
        </span>
      </div>
      <Progress value={goal.progress} />
      <div className="flex gap-2">
        <Input
          type="number"
          min="0"
          step="1"
          value={saved}
          onChange={(e) => setSaved(e.target.value)}
        />
        <Button type="button" size="sm" variant="outline" onClick={saveSaved}>
          Update saved
        </Button>
      </div>
    </li>
  );
}
