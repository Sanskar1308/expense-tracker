"use client";

import { Button } from "../ui/button";
import { formatRupee } from "../../lib/utils";
import { formatDueDate } from "../../lib/due-dates";
import type { LedgerMoveRow } from "../../lib/types";

export default function MoveList({
  moves,
  onUndo,
}: {
  moves: LedgerMoveRow[];
  onUndo: (id: string) => void;
}) {
  if (moves.length === 0) return null;

  return (
    <ul className="divide-y divide-stone-100 dark:divide-stone-800">
      {moves.map((m) => (
        <li
          key={m.id}
          className="flex items-center justify-between gap-2 py-1.5 text-sm"
        >
          <span className="text-stone-700 dark:text-stone-300">
            {formatDueDate(m.createdAt)} · {m.fromName} → {m.toName} ·{" "}
            {formatRupee(m.amount)}
            {m.note ? ` · ${m.note}` : ""}
          </span>
          <Button type="button" size="sm" variant="ghost" onClick={() => onUndo(m.id)}>
            Undo
          </Button>
        </li>
      ))}
    </ul>
  );
}
