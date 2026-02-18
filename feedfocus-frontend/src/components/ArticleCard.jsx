import { ExternalLink } from "lucide-react";
import { getCategoryPlaceholder } from "../utils/placeholders";
import { cn } from "../lib/utils";

const toReadableSnippet = (text = "", limit = 220) => {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= limit) return cleaned;
  const cut = cleaned.slice(0, limit);
  const safe = cut.slice(0, Math.max(cut.lastIndexOf(" "), 0)).trim();
  return `${safe || cut}...`;
};
const formatCardDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const ArticleCard = ({ article, actions = null, className = "" }) => {
  const fallbackImage = getCategoryPlaceholder(
    article.primaryCategory || article.topics?.[0] || "world",
  );
  const imageUrl = article.imageUrl || fallbackImage;

  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg border border-border/80 bg-background/75 p-2.5 shadow-[0_12px_24px_-20px_rgba(0,0,0,0.4)] sm:rounded-xl sm:p-3",
        className,
      )}
    >
      <img
        src={imageUrl}
        alt={article.title}
        className="mb-2.5 aspect-[16/9] w-full rounded-lg border border-border/70 bg-black/5 object-cover sm:mb-3 sm:rounded-xl"
        loading="lazy"
        onError={(event) => {
          event.currentTarget.src = fallbackImage;
        }}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="text-xs text-muted-foreground">
          {article.publisher}
          {article.publishedAt ? <span> • {formatCardDate(article.publishedAt)}</span> : null}
        </div>

        <h3 className="mt-1 line-clamp-3 text-sm font-semibold leading-snug sm:mt-2 sm:text-base">{article.title}</h3>

        {article.summary ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:mt-2 sm:line-clamp-3 sm:text-sm">{toReadableSnippet(article.summary, 200)}</p>
        ) : null}

        <div className="mt-auto pt-3 flex flex-wrap items-center gap-2">
          {article.url ? (
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline sm:text-sm"
            >
              Read source
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
          {actions}
        </div>
      </div>
    </article>
  );
};

export default ArticleCard;
