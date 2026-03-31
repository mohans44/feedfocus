import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
import ErrorState from "../components/ErrorState";
import AiSummaryDialog from "../components/AiSummaryDialog";
import { useAiSummary } from "../hooks/useAiSummary";
import VirtualArticleGrid from "../components/VirtualArticleGrid";

const Articles = ({ title = "All Articles", useSearchQuery = false }) => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const topic = searchParams.get("topic") || undefined;
  const q = useSearchQuery
    ? searchParams.get("q") || undefined
    : searchParams.get("q") || undefined;
  const [items, setItems] = useState([]);
  const [showGoTop, setShowGoTop] = useState(false);
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

  const fetchArticlesPage = async ({ pageParam }) => {
    const response = await getArticles({
      ...params,
      cursor: pageParam || undefined,
    });
    if (response.error) {
      throw new Error(response.error);
    }
    return response;
  };

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["articles-infinite", params],
    queryFn: fetchArticlesPage,
    getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
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
  const preferences = meData?.user?.preferences || [];
  const { aiLoadingId, aiSummaryById, requestSummary, hasSummary } =
    useAiSummary({ fetchSummary: getAiSummary });

  useEffect(() => {
    const flattened = data?.pages
      ? data.pages.flatMap((page) => page.items || [])
      : data?.items || [];
    setItems(flattened);
  }, [data]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

  useEffect(() => {
    const onScroll = () => setShowGoTop(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const errorMessage = isError ? error?.message : "";

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

      {isError ? (
        <ErrorState
          title="Could not load articles"
          message={errorMessage || "Please try again in a moment."}
          onAction={refetch}
        />
      ) : null}

      {!isLoading && !isError && !items.length ? (
        <p className="py-2 text-center text-sm text-muted-foreground">
          End of the road... for now. Our news robots are out fetching the next
          scoop.
        </p>
      ) : null}

      {!isLoading && !isError && items.length ? (
        <VirtualArticleGrid
          items={items}
          className="mt-1"
          renderItem={(article) => (
            <div key={article._id || article.url}>
              <ArticleCard
                article={article}
                showWhy={Boolean(meData?.user)}
                preferences={preferences}
                fixedHeight
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
                          if (bookmarkIdSet.has(articleId))
                            await removeBookmark(articleId);
                          else await addBookmark(articleId);
                          await queryClient.invalidateQueries({
                            queryKey: ["bookmarks"],
                          });
                          setBookmarkBusyId(null);
                        }}
                      >
                        {bookmarkIdSet.has(article._id) ? (
                          <BookmarkCheck className="h-4 w-4 text-primary" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                        {bookmarkIdSet.has(article._id)
                          ? "Bookmarked"
                          : "Bookmark"}
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
                          if (!hasSummary(article._id)) {
                            const data = await requestSummary(article._id);
                            if (data?.error) return;
                          }
                          setActiveSummaryArticle(article);
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
                          Failed to load AI summary:{" "}
                          {aiSummaryById[article._id].error}
                        </p>
                      ) : null}
                    </div>
                  ) : null
                }
              />
            </div>
          )}
        />
      ) : null}

      <div ref={sentinelRef} className="h-4 w-full" />

      {hasNextPage ? (
        <Button
          className="w-full sm:w-auto"
          variant="outline"
          onClick={fetchNextPage}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? "Loading..." : "Load more"}
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

      <AiSummaryDialog
        open={Boolean(
          activeSummaryArticle?._id &&
          aiSummaryById[activeSummaryArticle._id]?.summary,
        )}
        onClose={() => setActiveSummaryArticle(null)}
        article={activeSummaryArticle}
        summary={aiSummaryById[activeSummaryArticle?._id]?.summary}
        keyPoints={aiSummaryById[activeSummaryArticle?._id]?.keyPoints || []}
        category={
          aiSummaryById[activeSummaryArticle?._id]?.category ||
          activeSummaryArticle?.primaryCategory
        }
      />
    </div>
  );
};

export const AllArticlesPage = () => <Articles title="All Articles" />;
export const SearchResultsPage = () => (
  <Articles title="Search Results" useSearchQuery />
);

export default Articles;
