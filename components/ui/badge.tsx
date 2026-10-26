import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200",
        cash: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
        upi: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
        cc: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
        credit: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
        debit: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
