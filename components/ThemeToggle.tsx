"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme, type ThemeMode } from "./ThemeProvider";

const options: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const cycle: ThemeMode[] = ["light", "dark", "system"];

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

/** Compact control for nav / header — cycles Light → Dark → System */
export function ThemeCycleButton({ className }: { className?: string }) {
  const { mode, resolved, setMode } = useTheme();
  const Icon = mode === "system" ? Monitor : resolved === "dark" ? Moon : Sun;
  const next = cycle[(cycle.indexOf(mode) + 1) % cycle.length];

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      className={className}
      aria-label={`Theme: ${mode}. Click for ${next}`}
      title={`Theme: ${mode} (click for ${next})`}
      onClick={() => setMode(next)}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
