import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  X,
  Bookmark,
  Sun,
  Moon,
  CloudSun,
  CloudRain,
  CloudSnow,
  CloudFog,
  CloudLightning,
  SunMedium,
} from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "../utils/api";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(
    searchParams.get("q") || searchParams.get("search") || "",
  );
  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
    staleTime: 60 * 1000,
  });
  const isAuthResolved = !meLoading;
  const isLoggedIn = Boolean(meData?.user);
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const mobileSearchFormRef = useRef(null);
  const mobileSearchToggleRef = useRef(null);
  const userInitial = String(
    meData?.user?.username || meData?.user?.name || meData?.user?.email || "u",
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  const fetchJsonWithTimeout = async (url, timeoutMs = 10000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const getWeatherVisual = (code) => {
    if ([0, 1].includes(code))
      return { Icon: SunMedium, colorClass: "text-amber-500" };
    if ([2, 3].includes(code))
      return { Icon: CloudSun, colorClass: "text-cyan-500" };
    if ([45, 48].includes(code))
      return { Icon: CloudFog, colorClass: "text-slate-500" };
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code))
      return { Icon: CloudRain, colorClass: "text-sky-500" };
    if ([66, 67, 71, 73, 75, 85, 86].includes(code))
      return { Icon: CloudSnow, colorClass: "text-indigo-400" };
    if ([95, 96, 99].includes(code))
      return { Icon: CloudLightning, colorClass: "text-violet-500" };
    return { Icon: CloudSun, colorClass: "text-cyan-500" };
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    setQuery(searchParams.get("q") || searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    if (!showMobileSearch) return undefined;
    const onPointerDown = (event) => {
      const target = event.target;
      if (
        mobileSearchFormRef.current?.contains(target) ||
        mobileSearchToggleRef.current?.contains(target)
      ) {
        return;
      }
      setShowMobileSearch(false);
    };
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [showMobileSearch]);

  useEffect(() => {
    if (!showMobileSearch) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowMobileSearch(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showMobileSearch]);

  useEffect(() => {
    let ignore = false;

    const fetchWeather = async (lat, lon) => {
      try {
        setWeatherLoading(true);
        setWeatherError(false);
        const weatherJson = await fetchJsonWithTimeout(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`,
        );
        if (ignore) return;
        const temperature = weatherJson?.current?.temperature_2m;
        const weatherCode = weatherJson?.current?.weather_code;
        if (temperature === undefined || weatherCode === undefined) return;

        let city = "";
        let state = "";
        try {
          const reverseGeo = await fetchJsonWithTimeout(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
          );
          city =
            reverseGeo?.city ||
            reverseGeo?.locality ||
            reverseGeo?.principalSubdivision ||
            "";
          state = reverseGeo?.principalSubdivision || "";
        } catch {
          // keep empty city
        }
        if (ignore) return;

        if (!city) {
          throw new Error("Unable to resolve location name");
        }

        setWeather({
          city,
          temp: Math.round(temperature),
          code: weatherCode,
          lat,
          lon,
        });
        try {
          localStorage.setItem(
            "ff_user_location",
            JSON.stringify({
              city,
              state,
              lat,
              lon,
              ts: Date.now(),
            }),
          );
        } catch {
          // ignore storage failures
        }
        window.dispatchEvent(new Event("ff:location-updated"));
      } catch {
        if (!ignore) {
          setWeather(null);
          setWeatherError(true);
        }
      } finally {
        if (!ignore) setWeatherLoading(false);
      }
    };

    if (!isLoggedIn) {
      setWeather(null);
      setWeatherLoading(false);
      setWeatherError(false);
      return undefined;
    }

    const cachedRaw = localStorage.getItem("ff_weather_coords");
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw);
        if (cached?.lat && cached?.lon) {
          fetchWeather(cached.lat, cached.lon);
        }
      } catch {
        // ignore malformed cache
      }
    }

    if (!navigator.geolocation) return undefined;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        localStorage.setItem(
          "ff_weather_coords",
          JSON.stringify({ lat, lon, ts: Date.now() }),
        );
        fetchWeather(lat, lon);
      },
      () => {
        setWeatherLoading(false);
        setWeatherError(true);
      },
      { timeout: 10000, maximumAge: 30 * 60 * 1000 },
    );

    return () => {
      ignore = true;
    };
  }, [isLoggedIn]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const next = new URLSearchParams();
    if (query) {
      next.set("q", query);
    }
    navigate({ pathname: "/search", search: next.toString() });
    setShowMobileSearch(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/75 bg-background/84 shadow-[0_16px_32px_-24px_rgba(0,0,0,0.5)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/78">
      <div className="container flex h-12 items-center justify-between gap-1.5 sm:h-16 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="group rounded-xl px-2 py-1 transition duration-300 hover:bg-muted/75"
            onClick={() => navigate("/")}
          >
            <span className="font-display text-base font-semibold tracking-[0.08em] transition duration-300 group-hover:text-primary sm:text-xl">
              feedfocus
            </span>
          </button>
          {isLoggedIn && (weather || weatherLoading || weatherError) ? (
            <button
              type="button"
              onClick={() => {
                if (!weather?.lat || !weather?.lon) return;
                window.open(
                  `https://www.weather.com/weather/today/l/${weather.lat},${weather.lon}`,
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card/92 px-1.5 py-0.5 text-[10px] text-muted-foreground shadow-sm transition duration-300 hover:border-border hover:bg-card sm:px-2.5 sm:py-1 sm:text-xs"
              aria-label="Open weather details"
              disabled={!weather?.lat || !weather?.lon}
            >
              {(() => {
                const { Icon, colorClass } = getWeatherVisual(weather?.code);
                return <Icon className={`h-3.5 w-3.5 ${colorClass}`} />;
              })()}
              <span className="hidden max-w-[120px] truncate sm:inline">
                {weather?.city ||
                  (weatherLoading ? "Locating..." : "Weather unavailable")}
              </span>
              <span className="font-semibold text-foreground">
                {weather ? `${weather.temp}°C` : weatherLoading ? "..." : "--"}
              </span>
            </button>
          ) : null}
        </div>

        <form
          className="hidden max-w-xl flex-1 items-center md:flex"
          onSubmit={submitSearch}
          aria-label="Search articles"
        >
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/55" />
            <Input
              placeholder="Search news, topics, publishers…"
              className="h-9 rounded-full border-border/70 bg-card/92 pl-11 pr-11 text-sm placeholder:text-muted-foreground/55 transition duration-300 focus-visible:bg-card focus-visible:ring-primary/40"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
                onClick={() => setQuery("")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </form>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label="Search"
            aria-expanded={showMobileSearch}
            className="md:hidden"
            ref={mobileSearchToggleRef}
            onClick={() => setShowMobileSearch((prev) => !prev)}
          >
            <Search className="h-[18px] w-[18px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="rounded-full border border-transparent transition duration-300 hover:border-border/70 hover:bg-muted/70"
          >
            {theme === "dark" ? (
              <Sun className="h-[18px] w-[18px]" />
            ) : (
              <Moon className="h-[18px] w-[18px]" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label="Bookmarks"
            className={`hidden rounded-full transition duration-300 sm:inline-flex ${location.pathname === "/bookmarks" ? "bg-muted text-primary" : "hover:bg-muted/70"}`}
            onClick={() => navigate(isLoggedIn ? "/bookmarks" : "/login")}
            disabled={!isAuthResolved}
          >
            <Bookmark className="h-[18px] w-[18px]" />
          </Button>
          {isLoggedIn ? (
            <button
              type="button"
              aria-label="Profile"
              onClick={() => navigate("/profile")}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-[0_10px_18px_-12px_hsl(var(--primary)/0.9)] transition duration-300 active:scale-95 ${location.pathname === "/profile" ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""} bg-gradient-to-br from-primary to-[#ff6a4d]`}
            >
              {userInitial}
            </button>
          ) : null}
          {!isLoggedIn && isAuthResolved ? (
            <Button
              size="sm"
              type="button"
              onClick={() => navigate("/login")}
              className="rounded-full px-4 text-xs font-semibold"
            >
              Sign in
            </Button>
          ) : null}
          {!isLoggedIn && !isAuthResolved ? (
            <div className="h-8 w-16 animate-pulse rounded-full border border-border/70 bg-card/60" />
          ) : null}
        </div>
      </div>
      {showMobileSearch ? (
        <form
          className="container pb-2.5 md:hidden"
          onSubmit={submitSearch}
          aria-label="Search articles"
          ref={mobileSearchFormRef}
        >
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/55" />
            <Input
              placeholder="Search news, topics, publishers…"
              className="h-10 rounded-full border-border/70 bg-card/92 pl-11 pr-11 text-sm transition duration-300 focus-visible:bg-card"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
              autoFocus
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
                onClick={() => setQuery("")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </form>
      ) : null}
    </header>
  );
};

export default Navbar;
