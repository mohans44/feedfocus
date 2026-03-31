import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Newspaper } from "lucide-react";
import { getArticles } from "../utils/api";
import ArticleCard from "../components/ArticleCard";

const ArticleSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
    <div className="skeleton aspect-[16/9] w-full" />
    <div className="space-y-2.5 p-4">
      <div className="skeleton h-3 w-1/3 rounded-full" />
      <div className="skeleton h-4 w-full rounded" />
      <div className="skeleton h-4 w-5/6 rounded" />
      <div className="skeleton h-3 w-2/3 rounded" />
      <div className="mt-3 flex gap-2">
        <div className="skeleton h-7 w-24 rounded-lg" />
        <div className="skeleton h-7 w-16 rounded-lg" />
      </div>
    </div>
  </div>
);

const Feed = () => {
  const [searchParams] = useSearchParams();
  const topic = searchParams.get("topic") || undefined;
  const q = searchParams.get("q") || undefined;

  const params = useMemo(
    () => ({
      limit: 12,
      topic: topic ? topic.toLowerCase() : undefined,
      search: q || undefined,
    }),
    [topic, q],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["feed-preview", params],
    queryFn: () => getArticles(params),
    placeholderData: (prev) => prev,
  });

  const items = data?.items || [];

  return (
    <div className="space-y-5 pb-10">
      <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-sm sm:rounded-3xl sm:px-7 sm:py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Newspaper className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {q
              ? `Search: "${q}"`
              : topic
                ? `${topic.charAt(0).toUpperCase() + topic.slice(1)} Stories`
                : "Top Stories"}
          </h1>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {q
              ? `Showing results for "${q}"`
              : topic
                ? `Browsing ${topic} category`
                : "Latest trusted news from across the web"}
          </p>
        </div>
        {items.length > 0 ? (
          <span className="ml-auto shrink-0 rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {items.length} stories
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(12)].map((_, i) => (
            <ArticleSkeleton key={i} />
          ))}
        </div>
      ) : null}

      {!isLoading && !items.length ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card/80 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/70 text-3xl">
            📰
          </div>
          <div className="space-y-1">
            <p className="font-semibold">No stories found</p>
            <p className="text-sm text-muted-foreground">
              Our robots are out gathering the next scoop — check back shortly!
            </p>
          </div>
        </div>
      ) : null}

      {!isLoading && items.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((article) => (
            <ArticleCard key={article._id || article.url} article={article} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default Feed;
