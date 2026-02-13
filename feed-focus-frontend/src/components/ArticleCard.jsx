import { ExternalLink } from "lucide-react";
import { getCategoryPlaceholder } from "../utils/placeholders";

const toReadableSnippet = (text = "", limit = 220) => {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= limit) return cleaned;
  const cut = cleaned.slice(0, limit);
  const safe = cut.slice(0, Math.max(cut.lastIndexOf(" "), 0)).trim();
  return `${safe || cut}...`;
};

const ArticleCard = ({ article, actions = null }) => {
  const fallbackImage = getCategoryPlaceholder(article.primaryCategory || article.topics?.[0] || "world");
  const imageUrl = article.imageUrl || fallbackImage;

  return (
    <article className="top-sheen flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/80 p-3 shadow-[0_12px_28px_-24px_rgba(0,0,0,0.45)]">
      <img
        src={imageUrl}
        alt={article.title}
        className="mb-3 aspect-[16/10] w-full rounded-xl border border-border/70 bg-black/5 object-contain"
        onError={(event) => {
          event.currentTarget.src = fallbackImage;
        }}
      />

      <div className="text-xs text-muted-foreground">
        {article.publisher}
        {article.publishedAt ? <span> • {new Date(article.publishedAt).toLocaleString()}</span> : null}
      </div>

      <h3 className="mt-2 line-clamp-3 text-sm font-semibold sm:text-base">{article.title}</h3>

      {article.summary ? (
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{toReadableSnippet(article.summary, 200)}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
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
    </article>
  );
};

export default ArticleCard;
