import { ExternalLink, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { getCategoryPlaceholder } from "../utils/placeholders";
import { cn } from "../lib/utils";

const CATEGORY_BADGE_STYLES = {
  india:
    "bg-orange-100/90 text-orange-700 dark:bg-orange-950/45 dark:text-orange-300",
  world: "bg-blue-100/90 text-blue-700 dark:bg-blue-950/45 dark:text-blue-300",
  technology:
    "bg-violet-100/90 text-violet-700 dark:bg-violet-950/45 dark:text-violet-300",
  business:
    "bg-emerald-100/90 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300",
  health: "bg-rose-100/90 text-rose-700 dark:bg-rose-950/45 dark:text-rose-300",
  science:
    "bg-cyan-100/90 text-cyan-700 dark:bg-cyan-950/45 dark:text-cyan-300",
  sports:
    "bg-yellow-100/90 text-yellow-700 dark:bg-yellow-950/45 dark:text-yellow-300",
  culture:
    "bg-pink-100/90 text-pink-700 dark:bg-pink-950/45 dark:text-pink-300",
  entertainment:
    "bg-pink-100/90 text-pink-700 dark:bg-pink-950/45 dark:text-pink-300",
  fashion:
    "bg-fuchsia-100/90 text-fuchsia-700 dark:bg-fuchsia-950/45 dark:text-fuchsia-300",
  food: "bg-amber-100/90 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300",
  travel: "bg-teal-100/90 text-teal-700 dark:bg-teal-950/45 dark:text-teal-300",
  politics: "bg-red-100/90 text-red-700 dark:bg-red-950/45 dark:text-red-300",
};

const toReadableSnippet = (text = "", limit = 220) => {
  const cleaned = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
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
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

const estimateReadTime = (content = "", summary = "") => {
  const text = content || summary || "";
  const wordCount = String(text).trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 80) return null;
  const mins = Math.max(1, Math.round(wordCount / 220));
  return `${mins} min read`;
};

const resolveArticleId = (article = {}) => {
  const raw = article?._id;
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    if (typeof raw.$oid === "string") return raw.$oid;
    if (typeof raw.toString === "function") {
      const parsed = raw.toString();
      if (parsed && parsed !== "[object Object]") return parsed;
    }
  }
  return "";
};

const prettifyTopic = (topic = "") =>
  String(topic || "")
    .replace(/-/g, " ")
    .trim();

const getWhyLine = (article, preferences = []) => {
  const topic = article.primaryCategory || article.topics?.[0];
  const normalizedPrefs = new Set(
    (preferences || []).map((item) => String(item).toLowerCase()),
  );
  const matchesPreference = topic
    ? normalizedPrefs.has(String(topic).toLowerCase())
    : false;
  const publishedAt = article.publishedAt
    ? new Date(article.publishedAt).getTime()
    : null;
  const isFresh = publishedAt && Date.now() - publishedAt < 24 * 60 * 60 * 1000;

  const parts = [];
  if (topic) parts.push(`Topic: ${prettifyTopic(topic)}`);
  if (matchesPreference) parts.push("Matches your interests");
  if (isFresh) parts.push("Fresh today");
  return parts.slice(0, 2).join(" • ");
};

const ArticleCard = ({
  article,
  actions = null,
  className = "",
  showWhy = false,
  preferences = [],
  fixedHeight = false,
}) => {
  const fallbackImage = getCategoryPlaceholder(
    article.primaryCategory || article.topics?.[0] || "world",
  );
  const imageUrl = article.imageUrl || fallbackImage;
  const whyLine = showWhy ? getWhyLine(article, preferences) : "";
  const category = article.primaryCategory || article.topics?.[0] || "world";
  const badgeStyle =
    CATEGORY_BADGE_STYLES[category] || CATEGORY_BADGE_STYLES.world;
  const readTime = estimateReadTime(article.content, article.summary);
  const articleId = resolveArticleId(article);

  return (
    <article
      className={cn(
        "feed-card group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-[0_14px_30px_-24px_rgba(0,0,0,0.38)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-28px_rgba(0,0,0,0.5)]",
        fixedHeight ? "min-h-[330px] max-h-[370px]" : "",
        className,
      )}
    >
      <div className="relative overflow-hidden">
        <img
          src={imageUrl}
          alt={article.title}
          className="aspect-[16/9] w-full bg-muted/40 object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = fallbackImage;
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/22 via-transparent to-transparent transition duration-500 group-hover:from-black/16" />
        <span
          className={cn(
            "absolute bottom-2 left-2 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm",
            badgeStyle,
          )}
        >
          {prettifyTopic(category)}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-3.5">
        <div className="flex items-center gap-1.5 text-[11px] text-foreground/70">
          <span className="truncate font-medium">{article.publisher}</span>
          {article.publishedAt ? (
            <>
              <span className="shrink-0 opacity-50">•</span>
              <span className="shrink-0">
                {formatCardDate(article.publishedAt)}
              </span>
            </>
          ) : null}
          {readTime ? (
            <>
              <span className="shrink-0 opacity-50">•</span>
              <span className="inline-flex shrink-0 items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {readTime}
              </span>
            </>
          ) : null}
        </div>

        <h3 className="mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug tracking-[-0.014em] text-foreground/95 sm:text-[16px]">
          {article.title}
        </h3>

        {article.summary ? (
          <p
            className={cn(
              "mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-foreground/72 sm:line-clamp-3 sm:text-[13px]",
              fixedHeight ? "min-h-[36px]" : "",
            )}
          >
            {toReadableSnippet(article.summary, 200)}
          </p>
        ) : fixedHeight ? (
          <div className="mt-1.5 min-h-[36px]" />
        ) : null}

        {whyLine ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground/68">
            <span className="h-1 w-1 shrink-0 rounded-full bg-primary/70" />
            {whyLine}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          {articleId ? (
            <Link
              to={`/article/${articleId}`}
              state={{ article }}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary transition duration-300 hover:-translate-y-0.5 hover:bg-primary/18 active:scale-[0.97]"
            >
              Read full article
            </Link>
          ) : null}
          {article.url ? (
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/35 px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition duration-300 hover:-translate-y-0.5 hover:bg-muted/70 hover:text-foreground active:scale-[0.97]"
            >
              Source
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          ) : null}
          {actions}
        </div>
      </div>
    </article>
  );
};

export default ArticleCard;
