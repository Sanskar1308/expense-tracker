"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { DEFAULT_CATEGORIES } from "../lib/categories";
import { cn } from "../lib/utils";
import { apiSend } from "../lib/api-client";
import { queryKeys } from "../lib/query-keys";
import { useCategories } from "../hooks/useFinanceQueries";

export default function CategoryPicker({
  value,
  onChange,
  allowAdd = true,
}: {
  value: string;
  onChange: (value: string) => void;
  allowAdd?: boolean;
}) {
  const { data: categories = DEFAULT_CATEGORIES.map((c) => ({
    ...c,
    custom: false as boolean | undefined,
  })) } = useCategories();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function addCategory() {
    const name = newName.trim();
    if (!name) {
      setError("Name required");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const data = await apiSend<{ name: string }>("/api/categories", "POST", {
        name,
      });
      setNewName("");
      setAdding(false);
      await qc.invalidateQueries({ queryKey: queryKeys.categories });
      onChange(data.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm",
              value === c.value
                ? "bg-emerald-700 text-white"
                : "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200"
            )}
          >
            {c.label}
          </button>
        ))}
        {allowAdd && !adding && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-4 w-4" />
            Category
          </Button>
        )}
      </div>

      {adding && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name"
            className="max-w-[200px]"
            maxLength={40}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addCategory();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={() => void addCategory()}
          >
            {saving ? "Adding…" : "Add"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setAdding(false);
              setNewName("");
              setError("");
            }}
          >
            Cancel
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
