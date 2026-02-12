import { ExternalLink } from "lucide-react";
import { getCategoryPlaceholder } from "../utils/placeholders";

const ArticleCard = ({ article, actions = null }) => {
  const fallbackImage = getCategoryPlaceholder(article.primaryCategory || article.topics?.[0] || "world");
  const imageUrl = article.imageUrl || fallbackImage;

  return (
    <article className="top-sheen flex h-full flex-col rounded-2xl border border-border/80 bg-card/75 p-3">
      <img
        src={imageUrl}
        alt={article.title}
        className="mb-3 h-36 w-full rounded-xl border border-border/70 object-cover"
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
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{article.summary}</p>
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
