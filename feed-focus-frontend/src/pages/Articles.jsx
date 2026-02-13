import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUp } from "lucide-react";
import { getArticles } from "../utils/api";
import ArticleCard from "../components/ArticleCard";
import { Button } from "../components/ui/button";

const Articles = ({ title = "All Articles", useSearchQuery = false }) => {
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

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/70 bg-card/75 p-5 sm:p-6">
        <h1 className="text-2xl sm:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground">
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((article) => (
          <div key={article._id || article.url}>
            <ArticleCard article={article} />
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
        <p className="py-2 text-center text-sm text-muted-foreground">
          You made it to the end. Time for a coffee while we hunt more stories.
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
    </div>
  );
};

export const AllArticlesPage = () => <Articles title="All Articles" />;
export const SearchResultsPage = () => (
  <Articles title="Search Results" useSearchQuery />
);

export default Articles;
