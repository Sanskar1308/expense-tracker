"use client";

import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import type { CreditCard } from "../../lib/types";

export default function CardsManager() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [name, setName] = useState("");
  const [last4, setLast4] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/cards");
    if (res.ok) setCards(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, last4: last4 || null }),
      });
      if (res.ok) {
        setName("");
        setLast4("");
        load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function rename(card: CreditCard) {
    const next = prompt("Card name", card.name);
    if (!next?.trim()) return;
    await fetch(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: next.trim() }),
    });
    load();
  }

  async function toggleActive(card: CreditCard) {
    await fetch(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !card.isActive }),
    });
    load();
  }

  return (
    <section className="space-y-3 rounded-xl border border-stone-200 bg-white/90 p-4">
      <h2 className="text-lg font-semibold text-stone-900">Credit cards</h2>
      <form onSubmit={addCard} className="space-y-2">
        <div>
          <Label htmlFor="card-name">Name</Label>
          <Input
            id="card-name"
            className="mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="HDFC Millennia"
            required
          />
        </div>
        <div>
          <Label htmlFor="card-last4">Last 4 (optional)</Label>
          <Input
            id="card-last4"
            className="mt-1"
            value={last4}
            onChange={(e) => setLast4(e.target.value)}
            maxLength={4}
            placeholder="1234"
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Adding…" : "Add card"}
        </Button>
      </form>

      <ul className="divide-y divide-stone-100">
        {cards.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between gap-2 py-3 text-sm"
          >
            <div>
              <p className="font-medium text-stone-900">
                {c.name}
                {c.last4 ? ` ·${c.last4}` : ""}
              </p>
              <p className="text-xs text-stone-500">
                {c.isActive ? "Active" : "Inactive"}
              </p>
            </div>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant="outline" onClick={() => rename(c)}>
                Rename
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => toggleActive(c)}
              >
                {c.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          </li>
        ))}
        {cards.length === 0 && (
          <li className="py-4 text-sm text-stone-500">No cards yet.</li>
        )}
      </ul>
    </section>
  );
}
