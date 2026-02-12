import { cn } from "../../lib/utils";

function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "top-sheen rounded-3xl border border-border/90 bg-card/86 p-6 shadow-soft backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  return (
    <div className={cn("flex flex-col gap-2", className)} {...props} />
  );
}

function CardTitle({ className, ...props }) {
  return (
    <h3 className={cn("text-lg font-semibold", className)} {...props} />
  );
}

function CardContent({ className, ...props }) {
  return <div className={cn("mt-4", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardContent };
