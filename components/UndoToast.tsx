"use client";

import { Button } from "./ui/button";

export default function UndoToast({
  message,
  onUndo,
  onDismiss,
}: {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-900 px-3 py-2.5 text-sm text-white shadow-lg md:bottom-6">
      <span className="min-w-0 flex-1">{message}</span>
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            onUndo();
            onDismiss();
          }}
        >
          Undo
        </Button>
        <Button type="button" size="sm" variant="ghost" className="text-white hover:bg-stone-700" onClick={onDismiss}>
          ✕
        </Button>
      </div>
    </div>
  );
}
