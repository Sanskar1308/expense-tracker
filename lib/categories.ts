export const DEFAULT_CATEGORIES = [
  { value: "FOOD", label: "Food" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "ENTERTAINMENT", label: "Entertainment" },
  { value: "OTHER", label: "Other" },
] as const;

export type CategoryOption = {
  value: string;
  label: string;
  custom?: boolean;
  id?: string;
};

export function mergeCategories(
  custom: { id: string; name: string }[]
): CategoryOption[] {
  const defaults: CategoryOption[] = DEFAULT_CATEGORIES.map((c) => ({
    value: c.value,
    label: c.label,
    custom: false,
  }));
  const customs: CategoryOption[] = custom.map((c) => ({
    value: c.name,
    label: c.name,
    custom: true,
    id: c.id,
  }));
  return [...defaults, ...customs];
}

export function normalizeCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}
