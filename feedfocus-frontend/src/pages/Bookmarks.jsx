import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkX, ExternalLink, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { getAiSummary, getBookmarks, removeBookmark } from "../utils/api";
import ArticleCard from "../components/ArticleCard";

const Bookmarks = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [aiLoadingId, setAiLoadingId] = useState(null);
  const [aiSummaryById, setAiSummaryById] = useState({});
  const [activeSummaryArticle, setActiveSummaryArticle] = useState(null);
  const { data, isLoading } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: getBookmarks,
  });

  const items = useMemo(() => data?.items || [], [data]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 767px)").matches) {
      navigate("/profile", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!activeSummaryArticle?._id) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [activeSummaryArticle?._id]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-xl border border-border/70 bg-card/75 p-4 sm:rounded-3xl sm:p-6">
        <h1 className="text-2xl sm:text-3xl">Bookmarks</h1>
        <p className="text-sm text-muted-foreground">{items.length} saved articles.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl border border-border bg-card/60" />
          ))}
        </div>
      ) : null}

      {!isLoading && !items.length ? (
        <p className="text-sm text-muted-foreground">No bookmarks yet.</p>
      ) : null}

      <div className="space-y-2 md:hidden">
        {items.map((article) => (
          <article
            key={`m-${article._id || article.url}`}
            className="rounded-lg border border-border/80 bg-background/75 p-3"
          >
            <h3 className="line-clamp-2 text-sm font-semibold">{article.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{article.publisher}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {article.url ? (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Source
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await removeBookmark(article._id);
                  await queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
                }}
              >
                <BookmarkX className="h-4 w-4" />
                Remove
              </Button>
              <Button
                size="sm"
                variant="default"
                disabled={aiLoadingId === article._id}
                onClick={async () => {
                  if (!article._id) return;
                  if (activeSummaryArticle?._id === article._id) {
                    setActiveSummaryArticle(null);
                    return;
                  }
                  if (aiSummaryById[article._id] && !aiSummaryById[article._id].error) {
                    setActiveSummaryArticle(article);
                    return;
                  }
                  setAiLoadingId(article._id);
                  const data = await getAiSummary(article._id);
                  setAiSummaryById((prev) => ({ ...prev, [article._id]: data }));
                  setAiLoadingId(null);
                  if (!data?.error) setActiveSummaryArticle(article);
                }}
              >
                <Sparkles className="h-4 w-4" />
                {aiLoadingId === article._id
                  ? "Generating..."
                  : activeSummaryArticle?._id === article._id
                    ? "Hide AI summary"
                    : aiSummaryById[article._id]?.error
                      ? "Retry AI summary"
                      : "Show AI summary"}
              </Button>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden grid-cols-1 gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">
        {items.map((article) => (
          <ArticleCard
            key={article._id || article.url}
            article={article}
            actions={
              <div className="flex w-full flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await removeBookmark(article._id);
                    await queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
                  }}
                >
                  <BookmarkX className="h-4 w-4" />
                  Remove
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  disabled={aiLoadingId === article._id}
                  onClick={async () => {
                    if (!article._id) return;
                    if (activeSummaryArticle?._id === article._id) {
                      setActiveSummaryArticle(null);
                      return;
                    }
                    if (aiSummaryById[article._id] && !aiSummaryById[article._id].error) {
                      setActiveSummaryArticle(article);
                      return;
                    }
                    setAiLoadingId(article._id);
                    const data = await getAiSummary(article._id);
                    setAiSummaryById((prev) => ({ ...prev, [article._id]: data }));
                    setAiLoadingId(null);
                    if (!data?.error) setActiveSummaryArticle(article);
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  {aiLoadingId === article._id
                    ? "Generating..."
                    : activeSummaryArticle?._id === article._id
                      ? "Hide AI summary"
                      : aiSummaryById[article._id]?.error
                        ? "Retry AI summary"
                        : "Show AI summary"}
                </Button>
                {aiSummaryById[article._id]?.error ? (
                  <p className="w-full text-xs text-red-500">
                    Failed to load AI summary: {aiSummaryById[article._id].error}
                  </p>
                ) : null}
              </div>
            }
          />
        ))}
      </div>

      {activeSummaryArticle?._id &&
      aiSummaryById[activeSummaryArticle._id]?.summary ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm sm:hidden"
            onClick={() => setActiveSummaryArticle(null)}
          />
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex items-end justify-center p-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[460px] sm:max-w-[94vw] sm:p-0">
            <div className="pointer-events-auto w-full max-h-[84vh] overflow-y-auto rounded-t-3xl border border-border/90 bg-background p-4 shadow-soft sm:max-h-[72vh] sm:rounded-2xl sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary sm:text-[11px]">
                    1-minute AI summary •{" "}
                    {aiSummaryById[activeSummaryArticle._id]?.category ||
                      activeSummaryArticle.primaryCategory ||
                      "world"}
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-foreground sm:text-base">
                    {activeSummaryArticle.title}
                  </h3>
                  <p className="mt-1 text-xs text-foreground/75">
                    {activeSummaryArticle.publisher || "Source"}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close summary"
                  className="rounded-full border border-border/80 p-2 text-muted-foreground transition hover:bg-muted"
                  onClick={() => setActiveSummaryArticle(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-sm leading-6 text-foreground/92">
                {aiSummaryById[activeSummaryArticle._id]?.summary}
              </p>
              <div className="mt-4 flex justify-end sm:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSummaryArticle(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default Bookmarks;
