"use client";

import { Button } from "./ui/button";

export default function AccountPicker({
  accounts,
  value,
  onChange,
}: {
  accounts: { id: string; name: string; isActive?: boolean }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const list = accounts.filter((a) => a.isActive !== false);
  if (list.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {list.map((a) => (
        <Button
          key={a.id}
          type="button"
          size="sm"
          variant={value === a.id ? "default" : "outline"}
          onClick={() => onChange(a.id)}
        >
          {a.name}
        </Button>
      ))}
    </div>
  );
}
