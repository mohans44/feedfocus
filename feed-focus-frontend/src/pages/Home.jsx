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
  Flag,
  Globe,
  MapPin,
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
import ArticleCard from "../components/ArticleCard";
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
  { label: "Local", value: "local", icon: MapPin },
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

const readStoredState = () => {
  if (typeof window === "undefined") return "";
  try {
    const parsed = JSON.parse(localStorage.getItem("ff_user_location") || "{}");
    return String(parsed?.state || "").trim();
  } catch {
    return "";
  }
};

const STATE_KEYWORDS = {
  "andhra pradesh": ["andhra pradesh", "visakhapatnam", "vijayawada", "tirupati"],
  "arunachal pradesh": ["arunachal pradesh", "itanagar"],
  assam: ["assam", "guwahati", "dibrugarh", "silchar"],
  bihar: ["bihar", "patna", "gaya", "muzaffarpur"],
  chhattisgarh: ["chhattisgarh", "raipur", "bilaspur"],
  goa: ["goa", "panaji", "margao"],
  gujarat: ["gujarat", "ahmedabad", "surat", "vadodara", "rajkot"],
  haryana: ["haryana", "gurugram", "faridabad", "panipat"],
  "himachal pradesh": ["himachal pradesh", "shimla", "dharamshala"],
  jharkhand: ["jharkhand", "ranchi", "jamshedpur", "dhanbad"],
  karnataka: ["karnataka", "bengaluru", "mysuru", "hubballi"],
  kerala: ["kerala", "thiruvananthapuram", "kochi", "kozhikode"],
  "madhya pradesh": ["madhya pradesh", "bhopal", "indore", "jabalpur"],
  maharashtra: ["maharashtra", "mumbai", "pune", "nagpur", "nashik"],
  manipur: ["manipur", "imphal"],
  meghalaya: ["meghalaya", "shillong"],
  mizoram: ["mizoram", "aizawl"],
  nagaland: ["nagaland", "kohima", "dimapur"],
  odisha: ["odisha", "orissa", "bhubaneswar", "cuttack"],
  punjab: ["punjab", "amritsar", "ludhiana", "jalandhar"],
  rajasthan: ["rajasthan", "jaipur", "jodhpur", "udaipur"],
  sikkim: ["sikkim", "gangtok"],
  "tamil nadu": ["tamil nadu", "chennai", "coimbatore", "madurai"],
  telangana: ["telangana", "hyderabad", "warangal"],
  tripura: ["tripura", "agartala"],
  "uttar pradesh": ["uttar pradesh", "lucknow", "kanpur", "varanasi", "agra", "noida"],
  uttarakhand: ["uttarakhand", "dehradun", "haridwar"],
  "west bengal": ["west bengal", "kolkata", "howrah", "durgapur", "siliguri"],
  delhi: ["delhi", "new delhi", "ncr"],
  "jammu and kashmir": ["jammu and kashmir", "jammu", "srinagar", "kashmir"],
  ladakh: ["ladakh", "leh"],
  puducherry: ["puducherry", "pondicherry"],
  chandigarh: ["chandigarh"],
};

const localStateKeywords = (stateName = "") => {
  const lower = String(stateName || "").toLowerCase().trim();
  if (!lower) return [];
  const base = STATE_KEYWORDS[lower] || [lower];
  return Array.from(new Set([lower, ...base]));
};

const isLocalStateMatch = (article = {}, stateName = "") => {
  const keywords = localStateKeywords(stateName);
  if (!keywords.length) return false;
  const haystack = `${article.title || ""} ${article.summary || ""} ${(article.content || "").slice(0, 1200)} ${article.url || ""}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
};

const BannerCard = ({
  article,
  isBookmarked,
  onToggleBookmark,
  onShowSummary,
  summaryBusy = false,
}) => {
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
        className="relative z-[1] h-[220px] w-full bg-black/10 object-cover sm:h-[340px] sm:object-contain lg:h-[460px]"
        onError={(event) => {
          event.currentTarget.src = fallbackImage;
        }}
      />
      <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/95 via-black/82 to-black/68" />
      <button
        type="button"
        aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
        className="absolute right-3 top-3 z-[4] rounded-full border border-white/25 bg-black/64 p-2 text-white backdrop-blur-md transition hover:bg-black/78"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggleBookmark?.(article);
        }}
      >
        {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      </button>
      <button
        type="button"
        aria-label="Show AI summary"
        className="absolute bottom-3 right-3 z-[4] rounded-full border border-primary/70 bg-primary p-2 text-primary-foreground shadow-[0_10px_20px_-16px_hsl(var(--primary))] backdrop-blur-md transition hover:bg-primary/90 disabled:opacity-60"
        disabled={summaryBusy}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onShowSummary?.(article);
        }}
      >
        <Sparkles className="h-4 w-4" />
      </button>
      <div className="absolute bottom-0 left-0 right-0 z-[3] border-t border-white/10 bg-black/84 p-2.5 backdrop-blur-xl sm:p-4">
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
  const [carouselTrackIndex, setCarouselTrackIndex] = useState(1);
  const [carouselAnimating, setCarouselAnimating] = useState(true);
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
  const [userStateName, setUserStateName] = useState(() => readStoredState());
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

  const apiTopic =
    selectedTopic === "local"
      ? "india"
      : selectedTopic !== "for-you"
        ? selectedTopic
        : undefined;

  const { data: topData, isFetching: articlesFetching } = useQuery({
    queryKey: ["articles", selectedTopic, apiTopic, search, initialStoriesLimit],
    queryFn: () =>
      getArticles({
        limit: initialStoriesLimit,
        topic: apiTopic,
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
      ).filter((item) =>
        selectedTopic === "local" ? isLocalStateMatch(item, userStateName) : true
      ),
    [isActiveForYou, forYouData, topData, selectedTopic, userStateName],
  );

  const stories = useMemo(
    () => sortByPublishedTimeDesc([...baseStories, ...extraItems]),
    [baseStories, extraItems],
  );
  const carouselStories = useMemo(() => baseStories.slice(0, 6), [baseStories]);
  const carouselSlides = useMemo(() => {
    if (!carouselStories.length) return [];
    if (carouselStories.length === 1) return carouselStories;
    return [
      carouselStories[carouselStories.length - 1],
      ...carouselStories,
      carouselStories[0],
    ];
  }, [carouselStories]);
  const textStories = useMemo(() => {
    const items = stories.slice(carouselStories.length);
    if (meData?.user) return items;
    return items.slice(0, 12);
  }, [stories, carouselStories.length, meData?.user]);
  const showInitialLoading =
    categorySwitching || (isCategoryLoading && !stories.length);

  useEffect(() => {
    setCategorySwitching(true);
    setCarouselTrackIndex(1);
    setCarouselAnimating(true);
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
    const refreshStateFromStorage = () => setUserStateName(readStoredState());
    refreshStateFromStorage();
    window.addEventListener("ff:location-updated", refreshStateFromStorage);
    window.addEventListener("focus", refreshStateFromStorage);
    return () => {
      window.removeEventListener("ff:location-updated", refreshStateFromStorage);
      window.removeEventListener("focus", refreshStateFromStorage);
    };
  }, []);

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
      setCarouselTrackIndex((prev) => prev + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, [carouselStories.length]);

  useEffect(() => {
    if (!carouselStories.length) return;
    setCarouselAnimating(true);
    setCarouselTrackIndex(carouselStories.length > 1 ? 1 : 0);
  }, [carouselStories.length]);

  useEffect(() => {
    if (carouselStories.length <= 1) return;
    if (carouselTrackIndex < 0 || carouselTrackIndex > carouselStories.length + 1) {
      const normalized =
        ((((carouselTrackIndex - 1) % carouselStories.length) + carouselStories.length) %
          carouselStories.length) +
        1;
      setCarouselAnimating(false);
      setCarouselTrackIndex(normalized);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setCarouselAnimating(true));
      });
    }
  }, [carouselTrackIndex, carouselStories.length]);

  const onCarouselTransitionEnd = () => {
    if (carouselStories.length <= 1) return;
    if (carouselTrackIndex <= 0) {
      setCarouselAnimating(false);
      setCarouselTrackIndex(carouselStories.length);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setCarouselAnimating(true));
      });
      return;
    }
    if (carouselTrackIndex >= carouselStories.length + 1) {
      setCarouselAnimating(false);
      setCarouselTrackIndex(1);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setCarouselAnimating(true));
      });
    }
  };

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
      topic: apiTopic,
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

  useEffect(() => {
    if (!activeSummaryArticle?._id) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [activeSummaryArticle?._id]);

  return (
    <div className="space-y-3 sm:space-y-10">
      {!meData?.user ? (
        <section className="glass top-sheen rounded-2xl p-4 shadow-soft sm:rounded-[32px] sm:p-8">
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Badge variant="glow">AI Curated</Badge>
              <Badge>Reliable publishers</Badge>
              <Badge>Focus mode feed</Badge>
            </div>
            <h1 className="text-2xl sm:text-5xl">
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
        <div className="scrollbar-none -mx-0.5 flex snap-x gap-1.5 overflow-x-auto pb-1 pl-0.5 pr-0.5 sm:mx-0 sm:gap-3 sm:pb-2 sm:pl-0 sm:pr-0">
          {categories.map((category) => (
            <button
              key={category.value}
              type="button"
              className={`snap-start whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm ${
                category.value === selectedTopic
                  ? "border-accent bg-accent text-accent-foreground shadow-[0_10px_22px_-18px_hsl(var(--accent))]"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
              onClick={() => {
                if (category.value === selectedTopic) return;
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
          <div className="relative overflow-hidden rounded-xl sm:rounded-3xl">
            <div
              className={`flex will-change-transform ${carouselAnimating ? "transition-transform duration-700 ease-out" : "transition-none"}`}
              style={{ transform: `translateX(-${carouselTrackIndex * 100}%)` }}
              onTransitionEnd={onCarouselTransitionEnd}
            >
              {carouselSlides.map((article, index) => {
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
                    summaryBusy={aiLoadingId === article._id}
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
                    onShowSummary={async (selectedArticle) => {
                      if (!meData?.user) {
                        navigate("/auth");
                        return;
                      }
                      const articleId = selectedArticle?._id;
                      if (!articleId) return;
                      if (
                        aiSummaryById[articleId] &&
                        !aiSummaryById[articleId].error
                      ) {
                        setActiveSummaryArticle(selectedArticle);
                        return;
                      }
                      setAiLoadingId(articleId);
                      const data = await getAiSummary(articleId);
                      setAiSummaryById((prev) => ({
                        ...prev,
                        [articleId]: data,
                      }));
                      setAiLoadingId(null);
                      if (!data?.error) {
                        setActiveSummaryArticle(selectedArticle);
                      }
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
                  onClick={() => setCarouselTrackIndex((prev) => prev - 1)}
                  className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/38 p-1.5 text-white backdrop-blur-md transition hover:bg-black/55 sm:left-3 sm:p-2"
                >
                  <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next slide"
                  onClick={() => setCarouselTrackIndex((prev) => prev + 1)}
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/38 p-1.5 text-white backdrop-blur-md transition hover:bg-black/55 sm:right-3 sm:p-2"
                >
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {!showInitialLoading && textStories.length ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {textStories.map((article, index) => {
                const articleId = article._id;
                const isBookmarked = articleId
                  ? bookmarkIdSet.has(articleId)
                  : false;
                const isBusy = bookmarkBusyId === articleId;
                const aiPayload = articleId ? aiSummaryById[articleId] : null;
                const isSummaryOpen = activeSummaryArticle?._id === articleId;

                return (
                  <ArticleCard
                    key={`${article._id || article.url || article.title}-${index}`}
                    article={article}
                    actions={
                      <div className="flex w-full flex-wrap gap-1.5 sm:gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
                          onClick={() => onBookmark(article)}
                          disabled={isBusy || !articleId}
                        >
                          {isBookmarked ? (
                            <BookmarkCheck className="h-4 w-4 text-primary" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                          {isBookmarked ? "Bookmarked" : "Bookmark"}
                        </Button>
                        {articleId && meData?.user ? (
                          <Button
                            size="sm"
                            variant="default"
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
                          </Button>
                        ) : null}
                        {aiPayload?.error ? (
                          <p className="w-full text-xs text-red-500">
                            Failed to load AI summary: {aiPayload.error}
                          </p>
                        ) : null}
                      </div>
                    }
                  />
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
          className="fixed bottom-20 right-4 z-50 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-soft backdrop-blur-md transition hover:bg-muted sm:bottom-28 sm:right-6 sm:h-11 sm:w-11"
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

export default Home;
