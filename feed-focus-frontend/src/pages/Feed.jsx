import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getArticles } from "../utils/api";
import ArticleCard from "../components/ArticleCard";

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
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/70 bg-card/75 p-5 sm:p-6">
        <h1 className="text-2xl sm:text-3xl">Feed</h1>
        <p className="text-sm text-muted-foreground">Showing top stories</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-2xl border border-border bg-card/60"
            />
          ))}
        </div>
      ) : null}

      {!isLoading && !items.length ? (
        <p className="text-sm text-muted-foreground">No articles found.</p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((article) => (
          <ArticleCard key={article._id || article.url} article={article} />
        ))}
      </div>
    </div>
  );
};

export default Feed;
