import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkX, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { getAiSummary, getBookmarks, removeBookmark } from "../utils/api";
import ArticleCard from "../components/ArticleCard";
import AiSummaryDialog from "../components/AiSummaryDialog";
import { useAiSummary } from "../hooks/useAiSummary";
import { getCategoryPlaceholder } from "../utils/placeholders";

const resolveArticleId = (article = {}) => {
  const raw = article?._id;
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && typeof raw.$oid === "string") return raw.$oid;
  const parsed = String(raw);
  return parsed !== "[object Object]" ? parsed : "";
};

const Bookmarks = () => {
  const queryClient = useQueryClient();
  const [activeSummaryArticle, setActiveSummaryArticle] = useState(null);
  const [summaryData, setSummaryData] = useState(null);

  const { aiLoadingId, aiSummaryById, requestSummary } = useAiSummary({
    fetchSummary: getAiSummary,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: getBookmarks,
  });

  const items = useMemo(() => data?.items || [], [data]);

  const handleSummary = async (article) => {
    if (!article?._id) return;

    if (activeSummaryArticle?._id === article._id) {
      setActiveSummaryArticle(null);
      setSummaryData(null);
      return;
    }

    const cached = aiSummaryById[article._id];
    if (cached && !cached.error) {
      setActiveSummaryArticle(article);
      setSummaryData(cached);
      return;
    }

    const result = await requestSummary(article._id);
    if (result && !result.error) {
      setSummaryData(result);
      setActiveSummaryArticle(article);
    }
  };

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-sm sm:rounded-3xl sm:px-7 sm:py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <BookmarkX className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Bookmarks
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isLoading
              ? "Loading..."
              : items.length === 0
                ? "No saved articles yet"
                : `${items.length} saved article${items.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex h-24 animate-pulse gap-3 rounded-2xl border border-border/50 bg-card p-3"
            >
              <div className="h-full w-24 shrink-0 rounded-xl bg-muted/60" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 w-2/3 rounded bg-muted/60" />
                <div className="h-4 w-full rounded bg-muted/50" />
                <div className="h-4 w-4/5 rounded bg-muted/50" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!isLoading && !items.length ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card/80 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/70 text-3xl">
            🔖
          </div>
          <div className="space-y-1">
            <p className="font-semibold">No bookmarks yet</p>
            <p className="text-sm text-muted-foreground">
              Articles you save will appear here
            </p>
          </div>
          <Link
            to="/"
            className="mt-1 rounded-xl border border-border/70 bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            Browse stories
          </Link>
        </div>
      ) : null}

      {!isLoading && items.length ? (
        <div className="space-y-2.5 md:hidden">
          {items.map((article) => {
            const articleId = resolveArticleId(article);
            const fallback = getCategoryPlaceholder(
              article.primaryCategory || article.topics?.[0] || "world",
            );
            const imgSrc = article.imageUrl || fallback;

            return (
              <article
                key={`m-${article._id || article.url}`}
                className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
              >
                <div className="flex gap-3 p-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                    <img
                      src={imgSrc}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = fallback;
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-muted-foreground">
                      {article.publisher}
                    </p>
                    <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug">
                      {article.title}
                    </h3>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-border/40 px-3 py-2">
                  {articleId ? (
                    <Link
                      to={`/article/${articleId}`}
                      state={{ article }}
                      className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/8 px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary/15"
                    >
                      Read article
                    </Link>
                  ) : null}

                  {article.url ? (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      Source
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  ) : null}

                  <button
                    type="button"
                    disabled={aiLoadingId === article._id}
                    onClick={() => handleSummary(article)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    {aiLoadingId === article._id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {aiLoadingId === article._id ? "..." : "AI Summary"}
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await removeBookmark(article._id);
                      await queryClient.invalidateQueries({
                        queryKey: ["bookmarks"],
                      });
                    }}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg border border-red-300/40 bg-red-50/60 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100/80 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400"
                  >
                    <BookmarkX className="h-3 w-3" />
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {!isLoading && items.length ? (
        <div className="hidden grid-cols-1 gap-4 md:grid md:grid-cols-2 lg:grid-cols-3">
          {items.map((article) => (
            <ArticleCard
              key={article._id || article.url}
              article={article}
              actions={
                <div className="flex w-full flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300/40 text-red-600 hover:bg-red-50/60 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/20"
                    onClick={async () => {
                      await removeBookmark(article._id);
                      await queryClient.invalidateQueries({
                        queryKey: ["bookmarks"],
                      });
                    }}
                  >
                    <BookmarkX className="h-4 w-4" />
                    Remove
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    disabled={aiLoadingId === article._id}
                    onClick={() => handleSummary(article)}
                  >
                    {aiLoadingId === article._id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {aiLoadingId === article._id
                      ? "Generating..."
                      : "AI Summary"}
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      ) : null}

      <AiSummaryDialog
        open={Boolean(activeSummaryArticle)}
        onClose={() => {
          setActiveSummaryArticle(null);
          setSummaryData(null);
        }}
        article={activeSummaryArticle}
        summary={
          summaryData?.summary ||
          aiSummaryById[activeSummaryArticle?._id]?.summary ||
          ""
        }
        keyPoints={
          summaryData?.keyPoints ||
          aiSummaryById[activeSummaryArticle?._id]?.keyPoints ||
          []
        }
        category={
          summaryData?.category || activeSummaryArticle?.primaryCategory
        }
      />
    </div>
  );
};

export default Bookmarks;
