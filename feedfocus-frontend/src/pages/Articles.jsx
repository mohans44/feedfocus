import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Bookmark, BookmarkCheck, Sparkles, X } from "lucide-react";
import {
  addBookmark,
  getAiSummary,
  getArticles,
  getBookmarks,
  getMe,
  removeBookmark,
} from "../utils/api";
import ArticleCard from "../components/ArticleCard";
import { Button } from "../components/ui/button";

const Articles = ({ title = "All Articles", useSearchQuery = false }) => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const topic = searchParams.get("topic") || undefined;
  const q = useSearchQuery
    ? searchParams.get("q") || undefined
    : searchParams.get("q") || undefined;
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showGoTop, setShowGoTop] = useState(false);
  const [aiLoadingId, setAiLoadingId] = useState(null);
  const [aiSummaryById, setAiSummaryById] = useState({});
  const [activeSummaryArticle, setActiveSummaryArticle] = useState(null);
  const [bookmarkBusyId, setBookmarkBusyId] = useState(null);
  const sentinelRef = useRef(null);

  const params = useMemo(
    () => ({
      limit: 24,
      topic: topic ? topic.toLowerCase() : undefined,
      search: q || undefined,
    }),
    [topic, q],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["articles-initial", params],
    queryFn: () => getArticles(params),
    placeholderData: (prev) => prev,
  });
  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
  });
  const { data: bookmarksData } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: getBookmarks,
    enabled: Boolean(meData?.user),
  });
  const bookmarkIdSet = useMemo(
    () => new Set((bookmarksData?.items || []).map((item) => item._id)),
    [bookmarksData],
  );

  useEffect(() => {
    const initialItems = data?.items || [];
    setItems(initialItems);
    setCursor(data?.nextCursor || null);
    setHasMore(Boolean(data?.nextCursor));
  }, [data]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = await getArticles({ ...params, cursor: cursor || undefined });
    setItems((prev) => [...prev, ...(next.items || [])]);
    setCursor(next.nextCursor || null);
    setHasMore(Boolean(next.nextCursor));
    setLoadingMore(false);
  };

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor, hasMore, loadingMore]);

  useEffect(() => {
    const onScroll = () => setShowGoTop(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      <div className="rounded-xl border border-border/80 bg-card/80 p-4 sm:rounded-2xl sm:p-6">
        <h1 className="text-2xl sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {q ? `Results for "${q}"` : "feed."}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(24)].map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-2xl border border-border bg-card/60"
            />
          ))}
        </div>
      ) : null}

      {!isLoading && !items.length ? (
        <p className="py-2 text-center text-sm text-muted-foreground">
          End of the road... for now. Our news robots are out fetching the next scoop.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((article) => (
          <div key={article._id || article.url}>
            <ArticleCard
              article={article}
              actions={
                article?._id && meData?.user ? (
                  <div className="flex w-full flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bookmarkBusyId === article._id}
                      onClick={async () => {
                        const articleId = article._id;
                        if (!articleId) return;
                        setBookmarkBusyId(articleId);
                        if (bookmarkIdSet.has(articleId)) await removeBookmark(articleId);
                        else await addBookmark(articleId);
                        await queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
                        setBookmarkBusyId(null);
                      }}
                    >
                      {bookmarkIdSet.has(article._id) ? (
                        <BookmarkCheck className="h-4 w-4 text-primary" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                      {bookmarkIdSet.has(article._id) ? "Bookmarked" : "Bookmark"}
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      disabled={aiLoadingId === article._id}
                      onClick={async () => {
                        if (activeSummaryArticle?._id === article._id) {
                          setActiveSummaryArticle(null);
                          return;
                        }
                        if (
                          aiSummaryById[article._id] &&
                          !aiSummaryById[article._id].error
                        ) {
                          setActiveSummaryArticle(article);
                          return;
                        }
                        setAiLoadingId(article._id);
                        const data = await getAiSummary(article._id);
                        setAiSummaryById((prev) => ({
                          ...prev,
                          [article._id]: data,
                        }));
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
                ) : null
              }
            />
          </div>
        ))}
      </div>

      <div ref={sentinelRef} className="h-4 w-full" />

      {hasMore ? (
        <Button
          className="w-full sm:w-auto"
          variant="outline"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? "Loading..." : "Load more"}
        </Button>
      ) : (
        <p className="py-3 text-center text-sm text-muted-foreground">
          End of the road... for now.
        </p>
      )}

      {showGoTop ? (
        <button
          type="button"
          aria-label="Go to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-20 right-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-soft backdrop-blur-md transition hover:bg-muted sm:bottom-24 sm:right-6 sm:h-11 sm:w-11"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      ) : null}

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

export const AllArticlesPage = () => <Articles title="All Articles" />;
export const SearchResultsPage = () => (
  <Articles title="Search Results" useSearchQuery />
);

export default Articles;
