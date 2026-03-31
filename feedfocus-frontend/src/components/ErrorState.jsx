import { Button } from "./ui/button";

const ErrorState = ({
  title = "Something went wrong",
  message = "We couldn't load this section.",
  actionLabel = "Retry",
  onAction,
}) => {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1">{message}</p>
      {onAction ? (
        <div className="mt-3">
          <Button size="sm" variant="outline" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default ErrorState;
