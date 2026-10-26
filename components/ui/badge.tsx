import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-stone-100 text-stone-800",
        cash: "bg-amber-100 text-amber-900",
        upi: "bg-sky-100 text-sky-900",
        cc: "bg-violet-100 text-violet-900",
        credit: "bg-emerald-100 text-emerald-900",
        debit: "bg-rose-100 text-rose-900",
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
