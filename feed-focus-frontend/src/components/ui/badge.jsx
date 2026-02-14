import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
  {
    variants: {
      variant: {
        default: "bg-muted/85 text-muted-foreground",
        accent: "bg-accent text-accent-foreground",
        glow: "bg-primary text-primary-foreground shadow-[0_10px_20px_-16px_hsl(var(--primary))]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge };
