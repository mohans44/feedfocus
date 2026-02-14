import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowUp,
  ArrowRight,
  Atom,
  BadgeDollarSign,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Cpu,
  ExternalLink,
  Flag,
  Globe,
  Plane,
  ShieldPlus,
  Shirt,
  Sparkles,
  Trophy,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  addBookmark,
  getAiSummary,
  getArticles,
  getBookmarks,
  getForYou,
  getMe,
  removeBookmark,
} from "../utils/api";
import { getCategoryPlaceholder } from "../utils/placeholders";

const categories = [
  { label: "For You", value: "for-you", icon: Sparkles },
  { label: "India", value: "india", icon: Flag },
  { label: "World", value: "world", icon: Globe },
  { label: "Tech", value: "technology", icon: Cpu },
  { label: "Entertainment", value: "entertainment", icon: Clapperboard },
  { label: "Sports", value: "sports", icon: Trophy },
  { label: "Business", value: "business", icon: BadgeDollarSign },
  { label: "Science", value: "science", icon: Atom },
  { label: "Health", value: "health", icon: ShieldPlus },
  { label: "Food", value: "food", icon: UtensilsCrossed },
  { label: "Fashion", value: "fashion", icon: Shirt },
  { label: "Travel", value: "travel", icon: Plane },
];

const sortByPublishedTimeDesc = (items = []) =>
  [...items].sort((a, b) => {
    const aTime = new Date(a?.publishedAt || 0).getTime();
    const bTime = new Date(b?.publishedAt || 0).getTime();
    return bTime - aTime;
  });
const toReadableSnippet = (text = "", limit = 210) => {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
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
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const BannerCard = ({ article, isBookmarked, onToggleBookmark }) => {
  const fallbackImage = getCategoryPlaceholder(
    article.primaryCategory || article.topics?.[0] || "world",
  );
  const imageUrl = article.imageUrl || fallbackImage;

  return (
    <a
      href={article.url || "#"}
      target="_blank"
      rel="noreferrer"
      className="group relative block overflow-hidden rounded-[28px] border border-border/70 bg-card/90 shadow-[0_18px_36px_-28px_rgba(0,0,0,0.55)]"
    >
      <img
        src={imageUrl}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl brightness-35"
        onError={(event) => {
          event.currentTarget.src = fallbackImage;
        }}
      />
      <div className="absolute inset-0 z-[0] bg-black/40" />
      <img
        src={imageUrl}
        alt={article.title}
        className="relative z-[1] h-[220px] w-full bg-black/10 object-contain sm:h-[340px] lg:h-[460px]"
        onError={(event) => {
          event.currentTarget.src = fallbackImage;
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/80 to-black/55" />
      <button
        type="button"
        aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
        className="absolute right-3 top-3 z-[3] rounded-full border border-white/25 bg-black/60 p-2 text-white backdrop-blur-md transition hover:bg-black/75"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggleBookmark?.(article);
        }}
      >
        {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      </button>
      <div className="absolute bottom-0 left-0 right-0 z-[2] border-t border-white/10 bg-black/74 p-3 backdrop-blur-xl sm:p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75 sm:text-xs">
          {article.publisher || "Source"}
        </p>
        <h3 className="line-clamp-2 text-sm font-semibold text-white sm:text-lg lg:text-xl">
          {article.title}
        </h3>
      </div>
    </a>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTopic = searchParams.get("topic") || "for-you";
  const search = searchParams.get("q") || searchParams.get("search") || "";

  const [bookmarkBusyId, setBookmarkBusyId] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [aiLoadingId, setAiLoadingId] = useState(null);
  const [aiSummaryById, setAiSummaryById] = useState({});
  const [activeSummaryArticle, setActiveSummaryArticle] = useState(null);
  const [categorySwitching, setCategorySwitching] = useState(false);
  const [carouselBookmarkSet, setCarouselBookmarkSet] = useState(new Set());

  const [extraItems, setExtraItems] = useState([]);
  const [paginationCursor, setPaginationCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [autoLazyLoad, setAutoLazyLoad] = useState(false);
  const [showGoTop, setShowGoTop] = useState(false);
  const lazySentinelRef = useRef(null);

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
  });
  const initialStoriesLimit = 21;

  const { data: bookmarksData } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: getBookmarks,
    enabled: Boolean(meData?.user),
  });

  const { data: forYouData, isFetching: forYouFetching } = useQuery({
    queryKey: ["for-you", search, initialStoriesLimit],
    queryFn: () => getForYou({ limit: initialStoriesLimit }),
    enabled: Boolean(meData?.user) && selectedTopic === "for-you",
  });

  const { data: topData, isFetching: articlesFetching } = useQuery({
    queryKey: ["articles", selectedTopic, search, initialStoriesLimit],
    queryFn: () =>
      getArticles({
        limit: initialStoriesLimit,
        topic: selectedTopic !== "for-you" ? selectedTopic : undefined,
        search: search || undefined,
      }),
    enabled: selectedTopic !== "for-you" || !meData?.user,
  });

  const isActiveForYou = selectedTopic === "for-you" && Boolean(meData?.user);
  const isCategoryLoading = isActiveForYou ? forYouFetching : articlesFetching;
  const bookmarkIdSet = useMemo(
    () => new Set((bookmarksData?.items || []).map((item) => item._id)),
    [bookmarksData],
  );

  const baseStories = useMemo(
    () =>
      sortByPublishedTimeDesc(
        isActiveForYou ? forYouData?.items || [] : topData?.items || [],
      ),
    [isActiveForYou, forYouData, topData],
  );

  const stories = useMemo(
    () => sortByPublishedTimeDesc([...baseStories, ...extraItems]),
    [baseStories, extraItems],
  );
  const carouselStories = useMemo(() => baseStories.slice(0, 6), [baseStories]);
  const textStories = useMemo(() => {
    const items = stories.slice(carouselStories.length);
    if (meData?.user) return items;
    return items.slice(0, 12);
  }, [stories, carouselStories.length, meData?.user]);
  const showInitialLoading =
    categorySwitching || (isCategoryLoading && !stories.length);

  useEffect(() => {
    setCategorySwitching(true);
    setCarouselIndex(0);
    setAiSummaryById({});
    setAiLoadingId(null);
    setActiveSummaryArticle(null);
    setCarouselBookmarkSet(new Set());
    setExtraItems([]);
    setPaginationCursor(null);
    setHasMore(true);
    setLoadingMore(false);
    setAutoLazyLoad(false);
  }, [selectedTopic, search]);

  useEffect(() => {
    if (!isCategoryLoading) {
      setCategorySwitching(false);
    }
  }, [isCategoryLoading]);

  useEffect(() => {
    if (isActiveForYou) {
      const fallbackCursor = baseStories.length
        ? new Date(
            baseStories[baseStories.length - 1].publishedAt,
          ).toISOString()
        : null;
      setPaginationCursor(fallbackCursor);
      setHasMore(Boolean(fallbackCursor));
      return;
    }
    setPaginationCursor(topData?.nextCursor || null);
    setHasMore(Boolean(topData?.nextCursor));
  }, [isActiveForYou, topData, baseStories]);

  useEffect(() => {
    if (carouselStories.length <= 1) return undefined;
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % carouselStories.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [carouselStories.length]);

  useEffect(() => {
    if (!carouselStories.length) {
      setCarouselIndex(0);
      return;
    }
    setCarouselIndex((prev) => prev % carouselStories.length);
  }, [carouselStories.length]);

  const onBookmark = async (article) => {
    if (!meData?.user) {
      navigate("/auth");
      return;
    }
    const articleId = article._id;
    if (!articleId) return;
    setBookmarkBusyId(articleId);
    if (bookmarkIdSet.has(articleId)) await removeBookmark(articleId);
    else await addBookmark(articleId);
    await queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    setBookmarkBusyId(null);
  };

  const loadMoreStories = async () => {
    if (!meData?.user) return;
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const response = await getArticles({
      limit: 20,
      cursor: paginationCursor || undefined,
      topic: selectedTopic !== "for-you" ? selectedTopic : undefined,
      search: search || undefined,
    });
    const incoming = response.items || [];
    setExtraItems((prev) => {
      const seen = new Set(
        [...baseStories, ...prev].map((item) => item._id || item.url),
      );
      const unique = incoming.filter((item) => {
        const key = item._id || item.url;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return [...prev, ...unique];
    });
    setPaginationCursor(response.nextCursor || null);
    setHasMore(Boolean(response.nextCursor));
    setLoadingMore(false);
  };

  useEffect(() => {
    if (!meData?.user) return undefined;
    if (!autoLazyLoad || !hasMore) return;
    const node = lazySentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreStories();
      },
      { rootMargin: "350px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [autoLazyLoad, hasMore, paginationCursor, loadingMore, meData?.user]);

  useEffect(() => {
    const onScroll = () =>
      setShowGoTop(window.scrollY > 650 && extraItems.length > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [extraItems.length]);

  return (
    <div className="space-y-6 sm:space-y-10">
      {!meData?.user ? (
        <section className="glass top-sheen rounded-[32px] p-6 shadow-soft sm:p-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="glow">AI Curated</Badge>
              <Badge>Reliable publishers</Badge>
              <Badge>Focus mode feed</Badge>
            </div>
            <h1 className="text-3xl sm:text-5xl">
              Read less noise. Track more signal.
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              FeedFocus combines trusted journalism with ranking intelligence so
              every session starts with relevant top stories.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate("/auth")}>
                Sign in to personalize
              </Button>
              <Button variant="outline" onClick={() => navigate("/feed")}>
                Browse all stories
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-2 sm:space-y-4">
        <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1.5 sm:gap-3 sm:pb-2">
          {categories.map((category) => (
            <button
              key={category.value}
              type="button"
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:py-2 sm:text-sm ${
                category.value === selectedTopic
                  ? "border-accent/55 bg-accent text-accent-foreground shadow-[0_8px_20px_-16px_hsl(var(--accent))]"
                  : "border-border/90 bg-card/70 text-foreground hover:bg-muted/70"
              }`}
              onClick={() => {
                setCategorySwitching(true);
                const next = new URLSearchParams(searchParams);
                if (category.value === "for-you") next.delete("topic");
                else next.set("topic", category.value);
                setSearchParams(next);
              }}
            >
              <span className="mr-1.5 inline-flex align-middle">
                <category.icon className="h-4 w-4" />
              </span>
              {category.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4 sm:space-y-6">
        {showInitialLoading ? (
          <div className="space-y-3 sm:space-y-4">
            <div className="skeleton h-[180px] rounded-3xl sm:h-[300px] lg:h-[420px]" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, idx) => (
                <div key={idx} className="skeleton h-40 rounded-2xl sm:h-48" />
              ))}
            </div>
          </div>
        ) : null}

        {!showInitialLoading && carouselStories.length ? (
          <div className="relative overflow-hidden rounded-3xl">
            <div
              className="flex will-change-transform transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
            >
              {carouselStories.map((article, index) => {
                const key = article._id || article.url || article.title;
                const isBookmarked = carouselBookmarkSet.has(key);
                return (
                <div
                  key={`${article._id || article.url || article.title}-${index}`}
                  className="w-full flex-shrink-0"
                >
                  <BannerCard
                    article={article}
                    isBookmarked={isBookmarked}
                    onToggleBookmark={(selectedArticle) => {
                      const bookmarkKey =
                        selectedArticle._id || selectedArticle.url || selectedArticle.title;
                      setCarouselBookmarkSet((prev) => {
                        const next = new Set(prev);
                        if (next.has(bookmarkKey)) next.delete(bookmarkKey);
                        else next.add(bookmarkKey);
                        return next;
                      });
                    }}
                  />
                </div>
                );
              })}
            </div>
            {carouselStories.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Previous slide"
                  onClick={() =>
                    setCarouselIndex((prev) => (prev - 1 + carouselStories.length) % carouselStories.length)
                  }
                  className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/32 p-2 text-white backdrop-blur-md transition hover:bg-black/48"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next slide"
                  onClick={() =>
                    setCarouselIndex((prev) => (prev + 1) % carouselStories.length)
                  }
                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/32 p-2 text-white backdrop-blur-md transition hover:bg-black/48"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {!showInitialLoading && textStories.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {textStories.map((article, index) => {
                const articleId = article._id;
                const isBookmarked = articleId
                  ? bookmarkIdSet.has(articleId)
                  : false;
                const isBusy = bookmarkBusyId === articleId;
                const aiPayload = articleId ? aiSummaryById[articleId] : null;
                const isSummaryOpen = activeSummaryArticle?._id === articleId;
                const fallbackImage = getCategoryPlaceholder(
                  article.primaryCategory || article.topics?.[0] || "world",
                );
                const imageUrl = article.imageUrl || fallbackImage;

                return (
                  <article
                    key={`${article._id || article.url || article.title}-${index}`}
                    className="top-sheen flex h-full flex-col rounded-xl border border-border/80 bg-card/85 p-3 shadow-[0_12px_24px_-20px_rgba(0,0,0,0.4)] sm:rounded-2xl sm:p-3.5"
                  >
                    <img
                      src={imageUrl}
                      alt={article.title}
                      className="mb-3 aspect-[16/10] w-full rounded-xl border border-border/70 bg-black/5 object-contain"
                      onError={(event) => {
                        event.currentTarget.src = fallbackImage;
                      }}
                    />

                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground sm:text-xs">
                      <div className="min-w-0">
                        <p className="truncate">
                          {article.publisher || article.source}
                        </p>
                        {article.publishedAt ? (
                          <p className="hidden truncate sm:block">
                            {formatCardDate(article.publishedAt)}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="rounded-full p-1.5 transition hover:bg-muted"
                        aria-label={
                          isBookmarked ? "Remove bookmark" : "Add bookmark"
                        }
                        onClick={() => onBookmark(article)}
                        disabled={isBusy || !articleId}
                      >
                        {isBookmarked ? (
                          <BookmarkCheck className="h-4 w-4 text-primary" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    <h3 className="mt-1.5 line-clamp-3 text-sm font-semibold sm:mt-2 sm:text-base">
                      {article.title}
                    </h3>

                    {article.summary ? (
                      <p className="mt-1.5 hidden line-clamp-2 text-xs text-muted-foreground sm:mt-2 sm:block sm:line-clamp-3 sm:text-sm">
                        {toReadableSnippet(article.summary, 190)}
                      </p>
                    ) : null}

                    <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:mt-3 sm:gap-3">
                      {article.url ? (
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline sm:text-sm"
                        >
                          <span className="sm:hidden">Source</span>
                          <span className="hidden sm:inline">
                            Read original source
                          </span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                      {articleId ? (
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold transition sm:px-3 sm:py-1.5 sm:text-xs ${
                            isSummaryOpen
                              ? "border-primary/60 bg-primary text-primary-foreground"
                              : "border-primary/55 bg-primary/90 text-primary-foreground hover:bg-primary"
                          }`}
                          disabled={aiLoadingId === articleId}
                          onClick={async () => {
                            if (isSummaryOpen) {
                              setActiveSummaryArticle(null);
                              return;
                            }
                            if (
                              !aiSummaryById[articleId] ||
                              aiSummaryById[articleId].error
                            ) {
                              setAiLoadingId(articleId);
                              const data = await getAiSummary(articleId);
                              setAiSummaryById((prev) => ({
                                ...prev,
                                [articleId]: data,
                              }));
                              setAiLoadingId(null);
                            }
                            setActiveSummaryArticle(article);
                          }}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {aiLoadingId === articleId
                            ? "Generating..."
                            : isSummaryOpen
                              ? "Hide AI summary"
                              : aiPayload?.error
                                ? "Retry AI summary"
                                : "Show AI summary"}
                        </button>
                      ) : null}
                    </div>

                    {aiPayload?.error ? (
                      <p className="text-xs text-red-500">
                        Failed to load AI summary: {aiPayload.error}
                      </p>
                    ) : null}
                  </article>
                );
              })}
          </div>
        ) : null}

        {!showInitialLoading && !stories.length ? (
          <p className="py-2 text-center text-sm text-muted-foreground">
            End of the road... for now. Our news robots are out fetching the
            next scoop.
          </p>
        ) : null}

        {meData?.user && stories.length ? (
          hasMore ? (
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              onClick={async () => {
                setAutoLazyLoad(true);
                await loadMoreStories();
              }}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading..." : "Load more"}
              {!loadingMore ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          ) : (
            <p className="py-2 text-center text-sm text-muted-foreground">
              End of the road... for now. Our news robots are out fetching the
              next scoop.
            </p>
          )
        ) : null}
        <div ref={lazySentinelRef} className="h-4 w-full" />
      </section>

      {showGoTop ? (
        <button
          type="button"
          aria-label="Go to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-24 right-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-soft backdrop-blur-md transition hover:bg-muted sm:bottom-28 sm:right-6 sm:h-11 sm:w-11"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      ) : null}

      {activeSummaryArticle?._id &&
      aiSummaryById[activeSummaryArticle._id]?.summary ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="top-sheen w-full max-h-[86vh] overflow-y-auto rounded-t-3xl border border-border/80 bg-card p-4 shadow-soft sm:max-h-[80vh] sm:max-w-2xl sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  1-minute AI summary •{" "}
                  {aiSummaryById[activeSummaryArticle._id]?.category ||
                    activeSummaryArticle.primaryCategory ||
                    "world"}
                </p>
                <h3 className="mt-1 text-base font-semibold sm:text-lg">
                  {activeSummaryArticle.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
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
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {aiSummaryById[activeSummaryArticle._id]?.summary}
            </p>
            <div className="mt-5 flex justify-end sm:hidden">
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
      ) : null}
    </div>
  );
};

export default Home;
