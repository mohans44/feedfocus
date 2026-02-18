import { cn } from "../../lib/utils";

function Separator({ className, ...props }) {
  return (
    <div
      className={cn("h-px w-full bg-border/70", className)}
      {...props}
    />
  );
}

export { Separator };
