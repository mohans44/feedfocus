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
  MapPin,
  Plane,
  ShieldPlus,
  Shirt,
  Sparkles,
  Trophy,
  UtensilsCrossed,
  X,
} from "lucide-react";
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
  "andhra pradesh": [
    "andhra pradesh",
    "visakhapatnam",
    "vijayawada",
    "tirupati",
  ],
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
  "uttar pradesh": [
    "uttar pradesh",
    "lucknow",
    "kanpur",
    "varanasi",
    "agra",
    "noida",
  ],
  uttarakhand: ["uttarakhand", "dehradun", "haridwar"],
  "west bengal": ["west bengal", "kolkata", "howrah", "durgapur", "siliguri"],
  delhi: ["delhi", "new delhi", "ncr"],
  "jammu and kashmir": ["jammu and kashmir", "jammu", "srinagar", "kashmir"],
  ladakh: ["ladakh", "leh"],
  puducherry: ["puducherry", "pondicherry"],
  chandigarh: ["chandigarh"],
};

const localStateKeywords = (stateName = "") => {
  const lower = String(stateName || "")
    .toLowerCase()
    .trim();
  if (!lower) return [];
  const base = STATE_KEYWORDS[lower] || [lower];
  return Array.from(new Set([lower, ...base]));
};

const isLocalStateMatch = (article = {}, stateName = "") => {
  const keywords = localStateKeywords(stateName);
  if (!keywords.length) return false;
  const haystack =
    `${article.title || ""} ${article.summary || ""} ${(article.content || "").slice(0, 1200)} ${article.url || ""}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
};

const resolveArticleId = (article = {}) => {
  const raw = article?._id;
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    if (typeof raw.$oid === "string") return raw.$oid;
    if (typeof raw.toString === "function") {
      const parsed = raw.toString();
      if (parsed && parsed !== "[object Object]") return parsed;
    }
  }
  return "";
};

const BannerCard = ({
  article,
  isBookmarked,
  bookmarkBusy = false,
  bookmarkDisabled = false,
  onToggleBookmark,
  onShowSummary,
  onOpenArticle,
  summaryBusy = false,
}) => {
  const fallbackImage = getCategoryPlaceholder(
    article.primaryCategory || article.topics?.[0] || "world",
  );
  const imageUrl = article.imageUrl || fallbackImage;
  return (
    <article className="group relative overflow-hidden rounded-[30px] border border-border/60 bg-card/92 shadow-[0_30px_62px_-40px_rgba(0,0,0,0.66)] transition duration-500 hover:shadow-[0_40px_72px_-42px_rgba(0,0,0,0.74)]">
      <div
        role="button"
        tabIndex={0}
        className="block cursor-pointer"
        onClick={() => onOpenArticle?.(article)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpenArticle?.(article);
          }
        }}
      >
        <div className="relative h-[320px] overflow-hidden sm:h-[420px] lg:h-[540px]">
          <img
            src={imageUrl}
            alt={article.title}
            className="relative z-[1] h-full w-full bg-black/10 object-cover transition duration-700 group-hover:scale-[1.015]"
            onError={(event) => {
              event.currentTarget.src = fallbackImage;
            }}
          />
          <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/42 to-transparent" />
        </div>

        <div className="relative z-[3] overflow-hidden border-t border-slate-200 dark:border-white/18">
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-[0.7] dark:block"
            onError={(event) => {
              event.currentTarget.src = fallbackImage;
            }}
          />
          <div className="absolute inset-0 bg-white dark:bg-slate-900" />
          <div className="relative flex h-[132px] flex-col justify-between p-4 sm:h-[144px] sm:p-5">
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-white/92 sm:text-xs">
                {article.publisher || "Source"}
              </p>
              <h3 className="line-clamp-2 text-base font-semibold leading-tight tracking-[-0.012em] text-slate-900 dark:text-white sm:text-xl lg:text-[1.6rem]">
                {article.title}
              </h3>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-white/30 dark:bg-white/18 dark:text-white">
                Read full story
              </span>
              {article.url ? (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline dark:text-white/92 dark:hover:text-white"
                >
                  Source
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <button
        type="button"
        aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
        className="absolute right-3 top-3 z-[4] rounded-full border border-white/30 bg-black/45 p-2 text-white backdrop-blur-xl transition duration-300 hover:scale-105 hover:bg-black/62 disabled:opacity-60"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggleBookmark?.(article);
        }}
        disabled={bookmarkBusy || bookmarkDisabled}
      >
        {isBookmarked ? (
          <BookmarkCheck className="h-4 w-4" />
        ) : (
          <Bookmark className="h-4 w-4" />
        )}
      </button>
      <button
        type="button"
        aria-label="Show AI summary"
        className="absolute bottom-4 right-4 z-[4] rounded-full border border-primary/65 bg-primary p-2 text-primary-foreground shadow-[0_12px_24px_-16px_hsl(var(--primary))] backdrop-blur-md transition duration-300 hover:scale-105 hover:bg-primary/90 disabled:opacity-60"
        disabled={summaryBusy}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onShowSummary?.(article);
        }}
      >
        <Sparkles className="h-4 w-4" />
      </button>
    </article>
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
  const [carouselHoverPaused, setCarouselHoverPaused] = useState(false);
  const [aiLoadingId, setAiLoadingId] = useState(null);
  const [aiSummaryById, setAiSummaryById] = useState({});
  const [activeSummaryArticle, setActiveSummaryArticle] = useState(null);
  const [mobileSummaryOpenId, setMobileSummaryOpenId] = useState(null);
  const [mobileSummaryTransition, setMobileSummaryTransition] = useState(null);
  const [mobileImagePreview, setMobileImagePreview] = useState(null);
  const [mobileCardIndex, setMobileCardIndex] = useState(0);
  const [categorySwitching, setCategorySwitching] = useState(false);
  const [extraItems, setExtraItems] = useState([]);
  const [paginationCursor, setPaginationCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [autoLazyLoad, setAutoLazyLoad] = useState(false);
  const [showGoTop, setShowGoTop] = useState(false);
  const [userStateName, setUserStateName] = useState(() => readStoredState());
  const lazySentinelRef = useRef(null);
  const mobileSummaryTimerRef = useRef(null);
  const mobileTouchStartXRef = useRef(null);
  const mobileTouchStartYRef = useRef(null);
  const mobileTouchDeltaXRef = useRef(0);
  const mobileTouchDeltaYRef = useRef(0);
  const mobileSwipeDoneRef = useRef(false);
  const touchStartXRef = useRef(null);
  const touchDeltaXRef = useRef(0);
  const touchStartTimeRef = useRef(0);

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
    queryKey: [
      "articles",
      selectedTopic,
      apiTopic,
      search,
      initialStoriesLimit,
    ],
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
        selectedTopic === "local"
          ? isLocalStateMatch(item, userStateName)
          : true,
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
  const activeCarouselIndex = useMemo(() => {
    if (!carouselStories.length) return 0;
    if (carouselStories.length === 1) return 0;
    const normalized =
      (((carouselTrackIndex - 1) % carouselStories.length) +
        carouselStories.length) %
      carouselStories.length;
    return normalized;
  }, [carouselTrackIndex, carouselStories.length]);
  const textStories = useMemo(() => {
    const items = stories.slice(carouselStories.length);
    if (meData?.user) return items;
    return items.slice(0, 12);
  }, [stories, carouselStories.length, meData?.user]);
  const mobileStories = useMemo(() => {
    if (meData?.user) return stories;
    return stories.slice(0, 12);
  }, [stories, meData?.user]);
  const showInitialLoading =
    categorySwitching || (isCategoryLoading && !stories.length);
  const isCarouselAutoplayPaused =
    carouselHoverPaused ||
    Boolean(activeSummaryArticle?._id) ||
    Boolean(mobileSummaryOpenId);

  useEffect(() => {
    setCategorySwitching(true);
    setCarouselTrackIndex(1);
    setCarouselAnimating(true);
    setAiSummaryById({});
    setAiLoadingId(null);
    setActiveSummaryArticle(null);
    setMobileSummaryOpenId(null);
    setMobileSummaryTransition(null);
    setMobileImagePreview(null);
    setMobileCardIndex(0);
    setExtraItems([]);
    setPaginationCursor(null);
    setHasMore(true);
    setLoadingMore(false);
    setAutoLazyLoad(false);
  }, [selectedTopic, search]);

  useEffect(() => {
    return () => {
      if (mobileSummaryTimerRef.current) {
        clearTimeout(mobileSummaryTimerRef.current);
      }
    };
  }, []);

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
      window.removeEventListener(
        "ff:location-updated",
        refreshStateFromStorage,
      );
      window.removeEventListener("focus", refreshStateFromStorage);
    };
  }, []);

  useEffect(() => {
    if (isActiveForYou) {
      setPaginationCursor(null);
      setHasMore(false);
      return;
    }
    setPaginationCursor(topData?.nextCursor || null);
    setHasMore(Boolean(topData?.nextCursor));
  }, [isActiveForYou, topData, baseStories]);

  useEffect(() => {
    if (carouselStories.length <= 1) return undefined;
    if (isCarouselAutoplayPaused) return undefined;
    const timer = setInterval(() => {
      setCarouselTrackIndex((prev) => prev + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, [carouselStories.length, isCarouselAutoplayPaused]);

  useEffect(() => {
    if (!carouselStories.length) return;
    setCarouselAnimating(true);
    setCarouselTrackIndex(carouselStories.length > 1 ? 1 : 0);
  }, [carouselStories.length]);

  useEffect(() => {
    if (carouselStories.length <= 1) return;
    if (
      carouselTrackIndex < 0 ||
      carouselTrackIndex > carouselStories.length + 1
    ) {
      const normalized =
        ((((carouselTrackIndex - 1) % carouselStories.length) +
          carouselStories.length) %
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

  const onCarouselTouchStart = (event) => {
    const startX = event.touches?.[0]?.clientX ?? null;
    touchStartXRef.current = startX;
    touchDeltaXRef.current = 0;
    touchStartTimeRef.current = Date.now();
  };

  const onCarouselTouchMove = (event) => {
    if (touchStartXRef.current == null) return;
    const currentX = event.touches?.[0]?.clientX;
    if (typeof currentX !== "number") return;
    touchDeltaXRef.current = currentX - touchStartXRef.current;
  };

  const onCarouselTouchEnd = () => {
    if (carouselStories.length <= 1) return;
    const durationMs = Math.max(1, Date.now() - touchStartTimeRef.current);
    const velocity = Math.abs(touchDeltaXRef.current) / durationMs;
    const baseThreshold = 52;
    const momentumBoost = velocity > 0.55 ? 20 : velocity > 0.35 ? 10 : 0;
    const threshold = Math.max(28, baseThreshold - momentumBoost);

    if (touchDeltaXRef.current <= -threshold) {
      setCarouselTrackIndex((prev) => prev + 1);
    } else if (touchDeltaXRef.current >= threshold) {
      setCarouselTrackIndex((prev) => prev - 1);
    }

    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;
    touchStartTimeRef.current = 0;
  };

  const onMobileCardTouchStart = (event) => {
    mobileTouchStartXRef.current = event.touches?.[0]?.clientX ?? null;
    mobileTouchStartYRef.current = event.touches?.[0]?.clientY ?? null;
    mobileTouchDeltaXRef.current = 0;
    mobileTouchDeltaYRef.current = 0;
    mobileSwipeDoneRef.current = false;
  };

  const onMobileCardTouchMove = (event) => {
    if (
      mobileTouchStartXRef.current == null ||
      mobileTouchStartYRef.current == null
    )
      return;
    const currentX = event.touches?.[0]?.clientX;
    const currentY = event.touches?.[0]?.clientY;
    if (typeof currentX !== "number") return;
    if (typeof currentY !== "number") return;
    mobileTouchDeltaXRef.current = currentX - mobileTouchStartXRef.current;
    mobileTouchDeltaYRef.current = currentY - mobileTouchStartYRef.current;
  };

  const onMobileCardTouchEnd = () => {
    if (!mobileSwipeDoneRef.current) {
      const absX = Math.abs(mobileTouchDeltaXRef.current);
      const absY = Math.abs(mobileTouchDeltaYRef.current);
      const isHorizontalSwipe = absX >= 52 && absX > absY * 1.25;
      if (isHorizontalSwipe) {
        if (mobileTouchDeltaXRef.current < 0) {
          setMobileCardIndex((prev) =>
            Math.min(prev + 1, mobileStories.length - 1),
          );
        } else {
          setMobileCardIndex((prev) => Math.max(prev - 1, 0));
        }
        setMobileSummaryOpenId(null);
      }
    }
    mobileTouchStartXRef.current = null;
    mobileTouchStartYRef.current = null;
    mobileTouchDeltaXRef.current = 0;
    mobileTouchDeltaYRef.current = 0;
    mobileSwipeDoneRef.current = false;
  };

  const onBookmark = async (article) => {
    if (!meData?.user) {
      navigate("/login");
      return;
    }
    const articleId = article._id;
    if (!articleId) return;
    setBookmarkBusyId(articleId);
    try {
      if (bookmarkIdSet.has(articleId)) await removeBookmark(articleId);
      else await addBookmark(articleId);
      await queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    } finally {
      setBookmarkBusyId(null);
    }
  };

  const loadMoreStories = async () => {
    if (!meData?.user) return;
    if (isActiveForYou) return;
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
    if (isActiveForYou) return undefined;
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
    if (!meData?.user || loadingMore || !hasMore) return;
    if (isActiveForYou) return;
    if (typeof window === "undefined") return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile) return;
    if (mobileCardIndex >= mobileStories.length - 3) {
      loadMoreStories();
    }
  }, [
    mobileCardIndex,
    mobileStories.length,
    hasMore,
    loadingMore,
    meData?.user,
    paginationCursor,
  ]);

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

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div className="space-y-3 sm:space-y-9">
      {!meData?.user ? (
        <section className="fade-up-soft relative overflow-hidden rounded-2xl border border-border/70 bg-card/95 p-5 shadow-[0_20px_44px_-28px_rgba(15,23,42,0.46)] sm:rounded-[30px] sm:p-9">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_18%,hsl(var(--primary)/0.13)_0%,transparent_62%)]" />
          <div className="relative flex flex-col gap-4 sm:gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                <Sparkles className="h-3 w-3" />
                AI Curated
              </span>
              <span className="inline-flex items-center rounded-full border border-border/75 bg-muted/40 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                Reliable publishers
              </span>
              <span className="inline-flex items-center rounded-full border border-border/75 bg-muted/40 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                Focus mode feed
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold leading-[1.06] tracking-[-0.02em] sm:text-[3.4rem]">
                Read less noise.
                <br className="hidden sm:block" />
                <span className="text-primary"> Track more signal.</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                FeedFocus combines trusted journalism with AI ranking
                intelligence so every session starts with the stories that
                actually matter.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                className="rounded-xl shadow-[0_10px_22px_-12px_hsl(var(--primary)/0.7)] transition duration-300 hover:-translate-y-0.5"
                onClick={() => navigate("/login")}
              >
                Sign in to personalize
              </Button>
              <Button
                variant="outline"
                className="rounded-xl bg-card/80 transition duration-300 hover:-translate-y-0.5"
                onClick={() => navigate("/feed")}
              >
                Browse all stories
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="sticky top-11 z-30 bg-background/96 py-1.5 backdrop-blur-md sm:static sm:bg-transparent sm:py-0 sm:backdrop-blur-none">
        <div className="relative">
          <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-8 bg-gradient-to-r from-background/95 to-transparent sm:from-transparent" />
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-8 bg-gradient-to-l from-background/95 to-transparent sm:from-transparent" />
          <div className="chip-scroll -mx-0.5 flex snap-x flex-nowrap gap-1.5 overflow-x-auto pb-1 pl-0.5 pr-0.5 sm:mx-0 sm:gap-2 sm:pb-0">
            {categories.map((category) => (
              <button
                key={category.value}
                type="button"
                className={`snap-start inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all duration-300 sm:px-3.5 sm:py-2 sm:text-[13px] ${
                  category.value === selectedTopic
                    ? "border-primary/45 bg-primary text-primary-foreground shadow-[0_10px_24px_-14px_hsl(var(--primary)/0.95)]"
                    : "border-border/70 bg-card/95 text-foreground/90 hover:-translate-y-0.5 hover:border-border hover:bg-muted/75 hover:text-foreground"
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
                <category.icon className="h-3.5 w-3.5 shrink-0" />
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4 sm:space-y-6">
        {showInitialLoading ? (
          <div className="space-y-3 sm:space-y-4">
            <div className="md:hidden">
              <div className="skeleton h-[84dvh] rounded-xl" />
            </div>
            <div className="hidden md:block">
              <div className="skeleton h-[180px] rounded-3xl sm:h-[300px] lg:h-[420px]" />
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, idx) => (
                  <div
                    key={idx}
                    className="skeleton h-40 rounded-2xl sm:h-48"
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {!showInitialLoading && carouselStories.length ? (
          <div className="space-y-3">
            <div
              className="fade-up-soft relative hidden overflow-hidden rounded-2xl border border-border/65 bg-card/72 shadow-[0_26px_52px_-34px_rgba(0,0,0,0.62)] md:block md:rounded-3xl"
              onMouseEnter={() => setCarouselHoverPaused(true)}
              onMouseLeave={() => setCarouselHoverPaused(false)}
              onFocusCapture={() => setCarouselHoverPaused(true)}
              onBlurCapture={() => setCarouselHoverPaused(false)}
              onTouchStart={onCarouselTouchStart}
              onTouchMove={onCarouselTouchMove}
              onTouchEnd={onCarouselTouchEnd}
              onTouchCancel={onCarouselTouchEnd}
            >
              <div
                className={`flex will-change-transform ${carouselAnimating ? "transition-transform duration-700 ease-out" : "transition-none"}`}
                style={{
                  transform: `translateX(-${carouselTrackIndex * 100}%)`,
                }}
                onTransitionEnd={onCarouselTransitionEnd}
              >
                {carouselSlides.map((article, index) => {
                  const isBookmarked = article._id
                    ? bookmarkIdSet.has(article._id)
                    : false;
                  const isBusy = article._id
                    ? bookmarkBusyId === article._id
                    : false;
                  return (
                    <div
                      key={`${article._id || article.url || article.title}-${index}`}
                      className="w-full flex-shrink-0"
                    >
                      <BannerCard
                        article={article}
                        isBookmarked={isBookmarked}
                        bookmarkBusy={isBusy}
                        bookmarkDisabled={!article._id}
                        onOpenArticle={(selectedArticle) => {
                          const articleId = resolveArticleId(selectedArticle);
                          if (articleId) {
                            navigate(`/article/${articleId}`, {
                              state: { article: selectedArticle },
                            });
                            return;
                          }
                          if (selectedArticle?.url) {
                            window.open(
                              selectedArticle.url,
                              "_blank",
                              "noopener,noreferrer",
                            );
                          }
                        }}
                        summaryBusy={aiLoadingId === article._id}
                        onToggleBookmark={(selectedArticle) =>
                          onBookmark(selectedArticle)
                        }
                        onShowSummary={async (selectedArticle) => {
                          if (!meData?.user) {
                            navigate("/login");
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
                    className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/35 bg-black/55 p-2 text-white backdrop-blur-xl transition duration-300 hover:scale-105 hover:bg-black/70 sm:left-3"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next slide"
                    onClick={() => setCarouselTrackIndex((prev) => prev + 1)}
                    className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/35 bg-black/55 p-2 text-white backdrop-blur-xl transition duration-300 hover:scale-105 hover:bg-black/70 sm:right-3"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              ) : null}
            </div>

            {carouselStories.length > 1 ? (
              <div className="hidden justify-center md:flex">
                <div className="flex items-center gap-1.5 rounded-full border border-border/65 bg-card/92 px-3 py-1.5 shadow-[0_12px_26px_-20px_rgba(0,0,0,0.55)]">
                  {carouselStories.map((item, index) => (
                    <button
                      key={item._id || item.url || `${item.title}-${index}`}
                      type="button"
                      aria-label={`Go to slide ${index + 1}`}
                      onClick={() => {
                        if (carouselStories.length > 1) {
                          setCarouselTrackIndex(index + 1);
                        }
                      }}
                      className={`h-1.5 rounded-full transition-all ${
                        activeCarouselIndex === index
                          ? "w-5 bg-foreground"
                          : "w-1.5 bg-foreground/45 hover:bg-foreground/70"
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {!showInitialLoading && mobileStories.length ? (
          <div
            className="relative w-full max-w-full overflow-x-hidden pb-2 md:hidden"
            style={{ touchAction: "pan-y" }}
          >
            <div
              className="flex w-full will-change-transform transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${mobileCardIndex * 100}%)` }}
              onTouchStart={onMobileCardTouchStart}
              onTouchMove={onMobileCardTouchMove}
              onTouchEnd={onMobileCardTouchEnd}
              onTouchCancel={onMobileCardTouchEnd}
            >
              {mobileStories.map((article, index) => {
                const articleId = article._id;
                const isBookmarked = articleId
                  ? bookmarkIdSet.has(articleId)
                  : false;
                const isBusy = bookmarkBusyId === articleId;
                const aiPayload = articleId ? aiSummaryById[articleId] : null;
                const isSummaryOpen = mobileSummaryOpenId === articleId;
                const transitionPhase =
                  mobileSummaryTransition?.id === articleId
                    ? mobileSummaryTransition.phase
                    : null;
                const fallbackImage = getCategoryPlaceholder(
                  article.primaryCategory || article.topics?.[0] || "world",
                );
                const imageSrc = article.imageUrl || fallbackImage;
                const bodyText = isSummaryOpen
                  ? aiPayload?.summary || ""
                  : article.content || article.summary || "";

                return (
                  <div
                    key={`mobile-${article._id || article.url || article.title}-${index}`}
                    className="box-border w-full min-w-0 shrink-0 basis-full"
                  >
                    <article className="flex h-[82dvh] flex-col overflow-hidden rounded-xl border border-border/80 bg-background/75 p-3 shadow-[0_12px_24px_-20px_rgba(0,0,0,0.4)]">
                      <div className="relative mb-2.5">
                        <button
                          type="button"
                          className="block w-full"
                          onClick={() =>
                            setMobileImagePreview({
                              src: imageSrc,
                              fallback: fallbackImage,
                              title: article.title,
                            })
                          }
                        >
                          <img
                            src={imageSrc}
                            alt={article.title}
                            className="h-[34dvh] w-full rounded-lg border border-border/70 bg-black/5 object-cover"
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.src = fallbackImage;
                            }}
                          />
                        </button>
                        {article.url ? (
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Read source"
                            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white backdrop-blur-sm"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : null}
                      </div>
                      <div className="flex min-h-0 flex-1 flex-col">
                        <div className="w-full whitespace-normal break-words text-xs text-muted-foreground">
                          {article.publisher}
                        </div>
                        <h3 className="mt-1 w-full whitespace-normal break-words text-base font-semibold leading-snug">
                          {article.title}
                        </h3>
                        <div
                          key={`${articleId || index}-${isSummaryOpen ? "summary" : "content"}`}
                          className={`mt-2 min-h-0 flex-1 overflow-y-auto pr-1 ${
                            transitionPhase === "out"
                              ? "snap-fade-out"
                              : transitionPhase === "in"
                                ? "snap-fade-in"
                                : ""
                          }`}
                        >
                          <p className="w-full whitespace-normal break-words text-sm leading-6 text-muted-foreground">
                            {bodyText}
                          </p>
                        </div>
                        <div className="mt-2 flex w-full items-center gap-2">
                          {articleId ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="flex-1"
                              onClick={() => {
                                const safeId = resolveArticleId(article);
                                if (safeId)
                                  navigate(`/article/${safeId}`, {
                                    state: { article },
                                  });
                              }}
                            >
                              Read full
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
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
                            {isBookmarked ? "Bookmarked" : "Add bookmark"}
                          </Button>
                          {articleId && meData?.user ? (
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-1"
                              disabled={aiLoadingId === articleId}
                              onClick={async () => {
                                if (!articleId) return;
                                const animateSwap = (nextOpen) => {
                                  setMobileSummaryTransition({
                                    id: articleId,
                                    phase: "out",
                                  });
                                  if (mobileSummaryTimerRef.current) {
                                    clearTimeout(mobileSummaryTimerRef.current);
                                  }
                                  mobileSummaryTimerRef.current = setTimeout(
                                    () => {
                                      setMobileSummaryOpenId(
                                        nextOpen ? articleId : null,
                                      );
                                      setMobileSummaryTransition({
                                        id: articleId,
                                        phase: "in",
                                      });
                                      mobileSummaryTimerRef.current =
                                        setTimeout(() => {
                                          setMobileSummaryTransition(null);
                                        }, 230);
                                    },
                                    210,
                                  );
                                };
                                if (isSummaryOpen) {
                                  animateSwap(false);
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
                                  if (data?.error) return;
                                }
                                animateSwap(true);
                              }}
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              {aiLoadingId === articleId
                                ? "Generating..."
                                : isSummaryOpen
                                  ? "Hide AI summary"
                                  : aiPayload?.error
                                    ? "Retry"
                                    : "AI summary"}
                            </Button>
                          ) : null}
                          {aiPayload?.error ? (
                            <p className="w-full text-xs text-red-500">
                              Failed to load AI summary: {aiPayload.error}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {!showInitialLoading && textStories.length ? (
          <div className="hidden grid-cols-1 gap-3 md:grid md:grid-cols-2 xl:grid-cols-3">
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
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card/80 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/70 text-2xl">
              📰
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-sm">No stories right now</p>
              <p className="text-xs text-muted-foreground">
                Our crawlers are fetching fresh news — check back soon.
              </p>
            </div>
          </div>
        ) : null}

        <div className="hidden md:block">
          {meData?.user && stories.length && !isActiveForYou ? (
            hasMore ? (
              <div className="flex justify-center">
                <Button
                  className="rounded-xl px-6"
                  variant="outline"
                  onClick={async () => {
                    setAutoLazyLoad(true);
                    await loadMoreStories();
                  }}
                  disabled={loadingMore}
                >
                  {loadingMore
                    ? "Loading more stories..."
                    : "Load more stories"}
                  {!loadingMore ? <ArrowRight className="h-4 w-4" /> : null}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
                <span className="text-base">✓</span>
                <p className="text-xs text-muted-foreground">
                  You&apos;ve reached the end. All caught up!
                </p>
              </div>
            )
          ) : null}
        </div>
        <div ref={lazySentinelRef} className="h-4 w-full" />
      </section>

      {showGoTop ? (
        <button
          type="button"
          aria-label="Go to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-20 right-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/95 text-foreground shadow-[0_8px_24px_-8px_rgba(0,0,0,0.2)] backdrop-blur-md transition hover:bg-muted active:scale-95 dark:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] sm:bottom-8 sm:right-6 sm:h-11 sm:w-11"
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

      {mobileImagePreview ? (
        <div
          className="fixed inset-0 z-[70] bg-black/90 p-4 md:hidden"
          onClick={() => setMobileImagePreview(null)}
        >
          <button
            type="button"
            aria-label="Close image"
            className="absolute right-4 top-4 z-[71] inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/70 text-white shadow-[0_10px_24px_-12px_rgba(0,0,0,0.7)]"
            onClick={() => setMobileImagePreview(null)}
          >
            <X className="h-4 w-4" />
          </button>
          <div
            className="flex h-full items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={mobileImagePreview.src}
              alt={mobileImagePreview.title || "Article image"}
              className="max-h-[90vh] w-full rounded-xl object-contain"
              onError={(event) => {
                event.currentTarget.src = mobileImagePreview.fallback;
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Home;
