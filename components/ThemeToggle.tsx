"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme, type ThemeMode } from "./ThemeProvider";

const options: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          type="button"
          size="sm"
          variant={mode === value ? "default" : "outline"}
          onClick={() => setMode(value)}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      ))}
    </div>
  );
}
