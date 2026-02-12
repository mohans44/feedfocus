import { cn } from "../../lib/utils";

function Avatar({ className, ...props }) {
  return (
    <div
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground",
        className
      )}
      {...props}
    />
  );
}

export { Avatar };
