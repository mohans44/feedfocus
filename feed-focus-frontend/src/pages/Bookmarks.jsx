import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkX } from "lucide-react";
import { Button } from "../components/ui/button";
import { getBookmarks, removeBookmark } from "../utils/api";
import ArticleCard from "../components/ArticleCard";

const Bookmarks = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: getBookmarks,
  });

  const items = useMemo(() => data?.items || [], [data]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/70 bg-card/75 p-5 sm:p-6">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((article) => (
          <ArticleCard
            key={article._id || article.url}
            article={article}
            actions={
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
            }
          />
        ))}
      </div>
    </div>
  );
};

export default Bookmarks;
