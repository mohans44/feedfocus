import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, ShieldCheck, Newspaper } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { getArticles, getMe } from "../utils/api";

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
    <div className="space-y-10">
      <section className="top-sheen relative overflow-hidden rounded-[36px] border border-border/70 bg-gradient-to-br from-card/95 via-card/85 to-muted/55 p-8 shadow-soft dark:from-card/92 dark:via-card/90 dark:to-card/86 sm:p-12">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/75 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-ranked trusted news
            </div>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight sm:text-6xl">
              A focused news feed that thinks before it shows.
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              FeedFocus crawls reliable publishers, categorizes every article, and ranks your briefing using preference-aware intelligence.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate("/auth")}>
                Get started
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate("/feed")}>
                Explore top stories
              </Button>
            </div>
          </div>

          <Card className="glass space-y-4 p-6">
            <h2 className="text-lg font-semibold">Today in your briefing</h2>
            {topStoriesFetching ? (
              <div className="space-y-2">
                <div className="h-20 animate-pulse rounded-2xl bg-muted" />
                <div className="h-20 animate-pulse rounded-2xl bg-muted" />
                <div className="h-20 animate-pulse rounded-2xl bg-muted" />
              </div>
            ) : (
              dynamicBriefing.map((item, index) => (
                <div key={`${item._id || item.url || item.title}-${index}`} className="rounded-2xl border border-border/70 bg-background/65 p-4">
                  <h3 className="line-clamp-2 text-sm font-semibold sm:text-base">{item.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(item.primaryCategory || "world").replace("-", " ")} • {item.publisher || "Source"}
                  </p>
                </div>
              ))
            )}
            {!topStoriesFetching && !dynamicBriefing.length ? (
              <p className="text-sm text-muted-foreground">No stories available right now.</p>
            ) : null}
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="glass space-y-2 p-5">
          <Newspaper className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Publisher-first crawling</h3>
          <p className="text-sm text-muted-foreground">Coverage from reliable outlets, ingested continuously.</p>
        </Card>
        <Card className="glass space-y-2 p-5">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">AI-ranked for you</h3>
          <p className="text-sm text-muted-foreground">Preference, recency, and diversity scoring in one feed.</p>
        </Card>
        <Card className="glass space-y-2 p-5">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Secure 30-day sessions</h3>
          <p className="text-sm text-muted-foreground">Cookie auth with stable login and protected profile actions.</p>
        </Card>
      </section>
    </div>
  );
};

export default Landing;
