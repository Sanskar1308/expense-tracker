"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import type { CategoryOption } from "../lib/categories";
import { DEFAULT_CATEGORIES } from "../lib/categories";
import { cn } from "../lib/utils";

export default function CategoryPicker({
  value,
  onChange,
  allowAdd = true,
}: {
  value: string;
  onChange: (value: string) => void;
  allowAdd?: boolean;
}) {
  const [categories, setCategories] = useState<CategoryOption[]>(
    DEFAULT_CATEGORIES.map((c) => ({ ...c, custom: false }))
  );
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/categories");
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.categories)) setCategories(data.categories);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not add");
        return;
      }
      const name = data.name as string;
      setNewName("");
      setAdding(false);
      await load();
      onChange(name);
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
                : "bg-stone-100 text-stone-800"
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
        <form onSubmit={addCategory} className="flex flex-wrap items-center gap-2">
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name"
            className="max-w-[200px]"
            maxLength={40}
            required
          />
          <Button type="submit" size="sm" disabled={saving}>
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
        </form>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
