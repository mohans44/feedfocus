import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Brain,
  Globe,
  Rss,
  Zap,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { getArticles, getMe } from "../utils/api";

const STATS = [
  { value: "50+", label: "Publishers tracked" },
  { value: "12", label: "Categories covered" },
  { value: "AI", label: "Powered ranking" },
  { value: "24/7", label: "Continuous ingestion" },
];

const Landing = () => {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
  });
  const { data: topStoriesData, isFetching: topStoriesFetching } = useQuery({
    queryKey: ["landing-top-stories"],
    queryFn: () => getArticles({ limit: 3 }),
  });

  useEffect(() => {
    if (data?.user) {
      navigate("/");
    }
  }, [data, navigate]);

  const dynamicBriefing = topStoriesData?.items?.slice(0, 3) || [];

  return (
    <div className="space-y-8">
      <section className="top-sheen relative overflow-hidden rounded-[32px] border border-border/70 bg-gradient-to-br from-card/95 via-card/90 to-muted/50 p-8 shadow-soft dark:from-card/92 dark:via-card/88 dark:to-card/80 sm:rounded-[36px] sm:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/15 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-accent/12 blur-[80px]" />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI-ranked trusted news
            </div>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.12] tracking-[-0.02em] sm:text-5xl lg:text-6xl">
              News that cuts through the noise.
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              FeedFocus crawls reliable publishers, categorises every article
              with AI, and surfaces a personalised briefing ranked by your
              interests.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="gap-2"
              >
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/feed")}
                className="gap-2"
              >
                Explore top stories
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Card className="glass space-y-3 p-5">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Live briefing
              </h2>
            </div>
            {topStoriesFetching ? (
              <div className="space-y-2.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="space-y-1.5 rounded-xl border border-border/50 bg-background/40 p-3"
                  >
                    <div className="skeleton h-3.5 w-3/4 rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {dynamicBriefing.map((item, index) => (
                  <a
                    key={`${item._id || item.url || item.title}-${index}`}
                    href={item.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="group block rounded-xl border border-border/60 bg-background/50 p-3 transition hover:border-border hover:bg-background/80"
                  >
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      <span className="capitalize">
                        {(item.primaryCategory || "world").replace(/-/g, " ")}
                      </span>
                      {" · "}
                      {item.publisher || "Source"}
                    </p>
                  </a>
                ))}
                {!dynamicBriefing.length ? (
                  <p className="text-sm text-muted-foreground">
                    No stories available right now.
                  </p>
                ) : null}
              </div>
            )}
          </Card>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border/70 bg-card/80 px-4 py-4 text-center"
          >
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {stat.value}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass group space-y-3 p-5 transition hover:shadow-soft">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12">
            <Rss className="h-4.5 w-4.5 text-primary" />
          </div>
          <h3 className="text-[15px] font-semibold">
            Publisher-first crawling
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Coverage from reliable outlets, ingested continuously so your
            briefing is always fresh.
          </p>
        </Card>
        <Card className="glass group space-y-3 p-5 transition hover:shadow-soft">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/12">
            <Brain className="h-4.5 w-4.5 text-violet-500" />
          </div>
          <h3 className="text-[15px] font-semibold">AI-powered summaries</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            One-tap AI summaries with key points so you grasp any story in under
            a minute.
          </p>
        </Card>
        <Card className="glass group space-y-3 p-5 transition hover:shadow-soft">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/12">
            <Zap className="h-4.5 w-4.5 text-emerald-500" />
          </div>
          <h3 className="text-[15px] font-semibold">Personalised ranking</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Pick topics you care about and let the feed surface what matters
            most to you.
          </p>
        </Card>
        <Card className="glass group space-y-3 p-5 transition hover:shadow-soft">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/12">
            <Globe className="h-4.5 w-4.5 text-sky-500" />
          </div>
          <h3 className="text-[15px] font-semibold">
            12 categories, 50+ sources
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            India, World, Tech, Sports, Business and more with cleaner
            categorisation.
          </p>
        </Card>
      </section>
    </div>
  );
};

export default Landing;
