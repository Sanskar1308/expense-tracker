"use client";

import { Button } from "./ui/button";

export function accountsForPicker<T extends { name: string; isActive?: boolean }>(
  accounts: T[]
) {
  return accounts
    .filter((a) => a.isActive !== false || a.name === "Cash")
    .sort((a, b) => Number(b.name === "Cash") - Number(a.name === "Cash"));
}

/** Cash is only a cash-payment account. UPI and card never offer it. */
export function accountsForMethod<T extends { name: string; isActive?: boolean }>(
  accounts: T[],
  method: string | null | undefined
) {
  const list = accountsForPicker(accounts);
  if (method === "UPI" || method === "CC") {
    return list.filter((a) => a.name !== "Cash");
  }
  return list;
}

export default function AccountPicker({
  accounts,
  value,
  onChange,
}: {
  accounts: { id: string; name: string; isActive?: boolean }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const list = accountsForPicker(accounts);
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
