import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Sparkles,
  WandSparkles,
  Calendar,
  Building2,
  Loader2,
  CheckCircle2,
  Share2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  getAiCorrectedArticle,
  getAiSummary,
  getArticleById,
  getMe,
} from "../utils/api";
import { getCategoryPlaceholder } from "../utils/placeholders";
import AiSummaryDialog from "../components/AiSummaryDialog";

const CATEGORY_COLORS = {
  india: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  world: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  technology: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  business: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  health: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  science: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  sports: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  entertainment: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
  politics: "bg-red-500/15 text-red-600 dark:text-red-400",
  food: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  travel: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  fashion: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400",
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const estimateReadTime = (text = "") => {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  if (words < 80) return null;
  return `${Math.max(1, Math.round(words / 220))} min read`;
};

const splitParagraphs = (text = "") =>
  String(text || "")
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean);

const ArticleDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const articleRef = useRef(null);
  const [readProgress, setReadProgress] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [correctionData, setCorrectionData] = useState(null);
  const [correctionLoading, setCorrectionLoading] = useState(false);
  const [correctionError, setCorrectionError] = useState("");
  const [autoCorrectionAttemptedId, setAutoCorrectionAttemptedId] =
    useState("");
  const [copied, setCopied] = useState(false);

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["article", id],
    queryFn: () => getArticleById(id),
    enabled: Boolean(id),
  });

  const stateArticle = location.state?.article || null;
  const article = data?.item || stateArticle || null;
  const fallbackImage = getCategoryPlaceholder(
    article?.primaryCategory || article?.topics?.[0] || "world",
  );

  const displayTitle = correctionData?.correctedTitle || article?.title || "";
  const displayContent =
    correctionData?.correctedContent ||
    article?.content ||
    article?.summary ||
    "";
  const paragraphs = useMemo(
    () => splitParagraphs(displayContent),
    [displayContent],
  );
  const readTime = estimateReadTime(displayContent);
  const category = article?.primaryCategory || article?.topics?.[0] || "world";
  const categoryColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.world;

  useEffect(() => {
    const onScroll = () => {
      const el = articleRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight;
      const scrolled = Math.max(0, -rect.top);
      const progress = Math.min(100, Math.round((scrolled / total) * 100));
      setReadProgress(progress);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!article?.aiCorrected?.content) return;
    setCorrectionData(
      (prev) =>
        prev || {
          articleId: article._id,
          correctedTitle: article.aiCorrected.title || article.title,
          correctedContent: article.aiCorrected.content,
          highlights: article.aiCorrected.highlights || [],
          generatedAt: article.aiCorrected.generatedAt,
          model: article.aiCorrected.model,
        },
    );
  }, [article]);

  const runSummary = async () => {
    if (!article?._id) return;
    if (!meData?.user) {
      navigate("/auth");
      return;
    }
    setSummaryLoading(true);
    const payload = await getAiSummary(article._id);
    setSummaryLoading(false);
    if (!payload?.error) {
      setSummaryData(payload);
      setSummaryOpen(true);
    }
  };

  const runCorrection = useCallback(
    async ({ force = false } = {}) => {
      if (!article?._id) return;
      setCorrectionLoading(true);
      setCorrectionError("");
      const payload = await getAiCorrectedArticle(article._id, { force });
      setCorrectionLoading(false);
      if (payload?.error) {
        setCorrectionError(payload.error);
        return;
      }
      setCorrectionData(payload);
    },
    [article?._id],
  );

  useEffect(() => {
    const articleId = article?._id;
    if (!articleId) return;
    if (correctionData?.correctedContent) return;
    if (correctionLoading) return;
    if (autoCorrectionAttemptedId === String(articleId)) return;

    setAutoCorrectionAttemptedId(String(articleId));
    runCorrection();
  }, [
    article?._id,
    correctionData?.correctedContent,
    correctionLoading,
    autoCorrectionAttemptedId,
    runCorrection,
  ]);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: article?.title || "Article",
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // ignore
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-5 pb-10">
        <div className="skeleton h-9 w-24 rounded-xl" />
        <div className="overflow-hidden rounded-3xl border border-border/60">
          <div className="skeleton h-[52vw] max-h-[420px] w-full" />
          <div className="space-y-3 p-6">
            <div className="skeleton h-5 w-20 rounded-full" />
            <div className="skeleton h-9 w-5/6 rounded-lg" />
            <div className="skeleton h-9 w-3/4 rounded-lg" />
            <div className="skeleton h-4 w-48 rounded" />
          </div>
        </div>
        <div className="rounded-3xl border border-border/60 bg-card/75 p-6">
          <div className="space-y-3">
            {[100, 95, 100, 88, 92, 100, 78, 96].map((w, i) => (
              <div
                key={i}
                className={`skeleton h-[18px] rounded`}
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if ((isError && !stateArticle) || !article) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-border/70 bg-card/80 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/70 text-3xl">
            📰
          </div>
          <h1 className="text-xl font-semibold">Article unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This article may have been removed or is temporarily unavailable.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={refetch} variant="outline">
              Retry
            </Button>
            <Button asChild>
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const apiUnavailable = isError && Boolean(stateArticle);

  return (
    <>
      {/* Reading progress bar */}
      <div
        className="pointer-events-none fixed left-0 top-0 z-50 h-[3px] bg-primary transition-all duration-150 ease-out"
        style={{ width: `${readProgress}%` }}
      />

      <div ref={articleRef} className="mx-auto max-w-4xl pb-14">
        {/* Top nav bar */}
        <div className="mb-5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/90 px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted active:scale-[0.97]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/90 px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted active:scale-[0.97]"
            aria-label="Share article"
          >
            {copied ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            {copied ? "Copied!" : "Share"}
          </button>
        </div>

        {/* Hero card */}
        <section className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-[0_24px_48px_-20px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_48px_-20px_rgba(0,0,0,0.5)]">
          <div className="relative">
            <img
              src={article.imageUrl || fallbackImage}
              alt={article.title}
              className="h-[48vw] max-h-[440px] min-h-[200px] w-full object-cover"
              referrerPolicy="no-referrer"
              onError={(event) => {
                event.currentTarget.src = fallbackImage;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${categoryColor}`}
              >
                {category.replace(/-/g, " ")}
              </span>
            </div>
          </div>

          <div className="space-y-4 p-5 sm:p-8">
            {apiUnavailable ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/40 bg-amber-50/60 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/25">
                <span className="mt-0.5 text-base">⚠️</span>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Showing cached story — live endpoint temporarily unavailable.
                </p>
              </div>
            ) : null}

            <h1 className="text-[1.6rem] font-bold leading-[1.25] tracking-[-0.02em] sm:text-[2.2rem]">
              {displayTitle}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
              {article.publisher ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-foreground/80">
                  <Building2 className="h-3.5 w-3.5" />
                  {article.publisher}
                </span>
              ) : null}
              {article.publishedAt ? (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(article.publishedAt)}
                </span>
              ) : null}
              {readTime ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {readTime}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {article.url ? (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground/80 transition hover:bg-muted hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Read at source
                </a>
              ) : null}
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/15 disabled:opacity-50"
                onClick={runSummary}
                disabled={summaryLoading}
              >
                {summaryLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {summaryLoading ? "Generating..." : "AI Summary"}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-xs font-semibold text-foreground/75 transition hover:bg-muted disabled:opacity-50"
                onClick={() =>
                  runCorrection({ force: Boolean(correctionData) })
                }
                disabled={correctionLoading}
              >
                {correctionLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <WandSparkles className="h-3.5 w-3.5" />
                )}
                {correctionLoading
                  ? "Correcting..."
                  : correctionData
                    ? "Re-correct"
                    : "AI Correct"}
              </button>
            </div>
          </div>
        </section>

        {/* AI Highlights */}
        {correctionData?.highlights?.length ? (
          <section className="mt-4 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-2">
              <WandSparkles className="h-4 w-4 text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest text-primary/80">
                AI-Enhanced Key Points
              </p>
            </div>
            <ul className="space-y-2.5">
              {correctionData.highlights.map((point, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/90"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[10px] font-bold text-primary">
                    {index + 1}
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {correctionError ? (
          <div className="mt-4 rounded-xl border border-red-300/40 bg-red-50/60 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
            AI correction failed: {correctionError}
          </div>
        ) : null}

        {/* Article body */}
        <section className="mt-4 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
          <div className="border-b border-border/50 px-6 py-4 sm:px-8">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Full Article
            </h2>
          </div>
          <div className="px-5 py-6 sm:px-8 sm:py-8">
            <div className="prose-article space-y-5 text-[15.5px] leading-[1.85] text-foreground/90 sm:text-[16px]">
              {paragraphs.length ? (
                paragraphs.map((paragraph, index) => (
                  <p key={index} className="text-justify">
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-muted-foreground">
                  No article content available.
                </p>
              )}
            </div>
            {article.url ? (
              <div className="mt-8 border-t border-border/50 pt-6">
                <p className="mb-2 text-xs text-muted-foreground">
                  Continue reading at the original source:
                </p>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-muted/50 px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted"
                >
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  {article.publisher || "Original article"}
                  <span className="text-muted-foreground">→</span>
                </a>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <AiSummaryDialog
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        article={article}
        summary={summaryData?.summary || ""}
        keyPoints={summaryData?.keyPoints || []}
        category={summaryData?.category || article?.primaryCategory}
      />
    </>
  );
};

export default ArticleDetail;
