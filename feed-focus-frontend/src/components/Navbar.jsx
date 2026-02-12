import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Bookmark,
  UserCircle,
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
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || searchParams.get("search") || "");
  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
  });
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(false);

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
    if ([0, 1].includes(code)) return { Icon: SunMedium, colorClass: "text-amber-500" };
    if ([2, 3].includes(code)) return { Icon: CloudSun, colorClass: "text-cyan-500" };
    if ([45, 48].includes(code)) return { Icon: CloudFog, colorClass: "text-slate-500" };
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return { Icon: CloudRain, colorClass: "text-sky-500" };
    if ([66, 67, 71, 73, 75, 85, 86].includes(code)) return { Icon: CloudSnow, colorClass: "text-indigo-400" };
    if ([95, 96, 99].includes(code)) return { Icon: CloudLightning, colorClass: "text-violet-500" };
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
    let ignore = false;

    const fetchWeather = async (lat, lon) => {
      try {
        setWeatherLoading(true);
        setWeatherError(false);
        const weatherJson = await fetchJsonWithTimeout(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`
        );
        if (ignore) return;
        const temperature = weatherJson?.current?.temperature_2m;
        const weatherCode = weatherJson?.current?.weather_code;
        if (temperature === undefined || weatherCode === undefined) return;

        let city = "";
        try {
          const reverseGeo = await fetchJsonWithTimeout(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
          );
          city =
            reverseGeo?.city ||
            reverseGeo?.locality ||
            reverseGeo?.principalSubdivision ||
            "";
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
        });
      } catch {
        if (!ignore) {
          setWeather(null);
          setWeatherError(true);
        }
      } finally {
        if (!ignore) setWeatherLoading(false);
      }
    };

    if (!meData?.user) {
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
        localStorage.setItem("ff_weather_coords", JSON.stringify({ lat, lon, ts: Date.now() }));
        fetchWeather(lat, lon);
      },
      () => {
        setWeatherLoading(false);
        setWeatherError(true);
      },
      { timeout: 10000, maximumAge: 30 * 60 * 1000 }
    );

    return () => {
      ignore = true;
    };
  }, [meData?.user]);

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
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/70 backdrop-blur-lg">
      <div className="container flex h-14 items-center justify-between gap-2 sm:h-16 sm:gap-3">
        <button
          type="button"
          className="flex items-center gap-3 rounded-full px-1 py-1"
          onClick={() => navigate("/")}
        >
          <span className="font-display text-lg font-semibold tracking-tight sm:text-xl">
            feedfocus
          </span>
          {meData?.user && (weather || weatherLoading || weatherError) ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card/70 px-2 py-1 text-[11px] text-muted-foreground sm:px-2.5 sm:text-xs">
              {(() => {
                const { Icon, colorClass } = getWeatherVisual(weather?.code);
                return <Icon className={`h-3.5 w-3.5 ${colorClass}`} />;
              })()}
              <span className="hidden max-w-[120px] truncate sm:inline">
                {weather?.city || (weatherLoading ? "Locating..." : "Weather unavailable")}
              </span>
              <span className="font-semibold text-foreground">
                {weather ? `${weather.temp}°C` : weatherLoading ? "..." : "--"}
              </span>
            </span>
          ) : null}
        </button>

        {meData?.user ? (
          <form
            className="hidden max-w-xl flex-1 items-center md:flex"
            onSubmit={submitSearch}
          >
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search trusted news, topics, or publishers"
                className="h-10 border-border/80 bg-card/75 pl-11"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </form>
        ) : (
          <div className="hidden flex-1 md:block" />
        )}

        <div className="flex items-center gap-1 sm:gap-2">
          {meData?.user ? (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              aria-label="Search"
              className="md:hidden"
              onClick={() => navigate("/search")}
            >
              <Search className="h-5 w-5" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label="Toggle theme"
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label="Bookmarks"
            onClick={() => navigate(meData?.user ? "/bookmarks" : "/auth")}
          >
            <Bookmark className="h-5 w-5" />
          </Button>
          {meData?.user ? (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              aria-label="Profile"
              onClick={() => navigate("/profile")}
            >
              <UserCircle className="h-6 w-6" />
            </Button>
          ) : null}
          {!meData?.user ? (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => navigate("/auth")}
            >
              Sign in
            </Button>
          ) : null}
        </div>
      </div>
      {meData?.user ? (
        <form className="container hidden pb-3 md:hidden" onSubmit={submitSearch}>
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search trusted news, topics, or publishers"
              className="h-10 border-border/80 bg-card/75 pl-11"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </form>
      ) : null}
    </header>
  );
};

export default Navbar;
