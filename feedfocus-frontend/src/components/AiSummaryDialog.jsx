import { useEffect, useMemo, useRef } from "react";
import { X, Sparkles, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";

const getFocusableElements = (container) => {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(
    (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"),
  );
};

const prettifyCategory = (category = "") =>
  String(category || "world")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const AiSummaryDialog = ({
  open,
  onClose,
  article,
  summary,
  keyPoints = [],
  category,
}) => {
  const dialogRef = useRef(null);
  const lastActiveElementRef = useRef(null);
  const titleId = useMemo(
    () => `ai-summary-title-${article?._id || "article"}`,
    [article?._id],
  );
  const bodyId = useMemo(
    () => `ai-summary-body-${article?._id || "article"}`,
    [article?._id],
  );

  useEffect(() => {
    if (!open) return;
    lastActiveElementRef.current = document.activeElement;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusableElements(dialogRef.current);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const currentIndex = focusable.indexOf(document.activeElement);
      if (event.shiftKey) {
        const previousIndex =
          currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
        focusable[previousIndex].focus();
        event.preventDefault();
        return;
      }
      const nextIndex =
        currentIndex === -1 || currentIndex === focusable.length - 1
          ? 0
          : currentIndex + 1;
      focusable[nextIndex].focus();
      event.preventDefault();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const focusable = getFocusableElements(dialogRef.current);
    if (focusable[0]) {
      focusable[0].focus();
    } else {
      dialogRef.current?.focus();
    }
  }, [open, summary]);

  useEffect(() => {
    if (open) return undefined;
    const previous = lastActiveElementRef.current;
    if (previous && typeof previous.focus === "function") {
      previous.focus();
    }
    return undefined;
  }, [open]);

  if (!open) return null;

  const validKeyPoints = Array.isArray(keyPoints)
    ? keyPoints.filter((point) => String(point || "").trim())
    : [];

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex items-end justify-center p-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[480px] sm:max-w-[94vw]">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          tabIndex={-1}
          className="pointer-events-auto w-full max-h-[88vh] overflow-y-auto rounded-t-3xl border border-border/90 bg-background shadow-[0_-8px_48px_-8px_rgba(0,0,0,0.28)] focus:outline-none sm:max-h-[76vh] sm:rounded-2xl"
        >
          <div className="h-1 w-full rounded-t-3xl bg-gradient-to-r from-primary/80 via-primary to-primary/60 sm:rounded-t-2xl" />

          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary sm:text-[11px]">
                  AI Summary ·{" "}
                  <span className="normal-case">
                    {prettifyCategory(category)}
                  </span>
                </p>
              </div>
              <button
                type="button"
                aria-label="Close summary"
                className="rounded-full border border-border/80 p-1.5 text-muted-foreground transition hover:bg-muted"
                onClick={onClose}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2.5">
              <h3
                id={titleId}
                className="line-clamp-2 text-sm font-semibold leading-snug text-foreground"
              >
                {article?.title}
              </h3>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-[11px] text-muted-foreground">
                  {article?.publisher || "Source"}
                </p>
                {article?.url ? (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 text-[11px] text-primary hover:underline"
                  >
                    Read full <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ) : null}
              </div>
            </div>

            <p
              id={bodyId}
              className="mt-3.5 text-sm leading-[1.7] text-foreground/90"
            >
              {summary}
            </p>

            {validKeyPoints.length ? (
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Key Points
                </p>
                <ul className="space-y-2">
                  {validKeyPoints.map((point, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-foreground/85"
                    >
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80" />
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-4 flex justify-end sm:hidden">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AiSummaryDialog;
