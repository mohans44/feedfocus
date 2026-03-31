import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Sparkles, Zap, Shield, CheckCircle2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { getMe, loginUser, registerUser } from "../utils/api";
import { PREFERENCE_OPTIONS } from "../constants/preferences";

const Auth = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    identifier: "",
    username: "",
    password: "",
    confirmPassword: "",
    preferences: [],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const authInputClass =
    "bg-background/90 dark:bg-card/85 border-border/85 text-foreground placeholder:text-muted-foreground";
  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: 1,
  });

  useEffect(() => {
    if (meData?.user) {
      navigate("/", { replace: true });
    }
  }, [meData, navigate]);

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (mode === "register") {
      if (!form.username.trim()) {
        setError("Username is required");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (form.preferences.length < 4) {
        setError("Select at least 4 preferences");
        return;
      }
    }
    setLoading(true);
    const result =
      mode === "login"
        ? await loginUser({
            identifier: form.identifier,
            password: form.password,
          })
        : await registerUser({
            username: form.username,
            password: form.password,
            preferences: form.preferences,
          });
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Login failed");
      return;
    }
    if (result.data?.user) {
      queryClient.setQueryData(["me"], { user: result.data.user });
    }
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    navigate("/", { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center gap-0 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-[0_32px_64px_-24px_rgba(0,0,0,0.15)] dark:shadow-[0_32px_64px_-24px_rgba(0,0,0,0.5)] md:grid md:grid-cols-[1fr_1.1fr]">
      {/* Left panel — Branding */}
      <div className="relative hidden overflow-hidden rounded-l-3xl bg-gradient-to-br from-primary via-primary/90 to-rose-700 p-8 md:flex md:h-full md:flex-col md:justify-between lg:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_20%,rgba(255,255,255,0.08)_0%,transparent_60%)] pointer-events-none" />
        <div className="relative z-10">
          <span className="font-display text-2xl font-bold tracking-[0.08em] text-white/95">
            feedfocus
          </span>
          <p className="mt-1 text-sm font-medium text-white/60">
            Intelligent news, curated for you
          </p>
        </div>
        <div className="relative z-10 space-y-5">
          {[
            {
              icon: Zap,
              text: "Personalized AI-curated feed based on your interests",
            },
            {
              icon: Sparkles,
              text: "AI summaries & corrections powered by Cloudflare Workers",
            },
            {
              icon: Shield,
              text: "Trusted publishers. No clickbait. No noise.",
            },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Icon className="h-4 w-4 text-white" />
              </div>
              <p className="text-sm leading-relaxed text-white/80">{text}</p>
            </div>
          ))}
        </div>
        <p className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} FeedFocus
        </p>
      </div>

      {/* Right panel — Form */}
      <div className="w-full px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        <div className="mb-6 md:hidden">
          <span className="font-display text-xl font-bold tracking-[0.08em]">
            feedfocus
          </span>
        </div>

        <div className="mb-6 flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-border/70 bg-muted/50 p-1">
            <button
              type="button"
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              Sign up
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login"
            ? "Sign in to access your personalized feed."
            : "Set up your account and pick your interests."}
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-3">
            {mode === "login" ? (
              <div className="space-y-1.5">
                <label
                  htmlFor="auth-identifier"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Username or email
                </label>
                <Input
                  id="auth-identifier"
                  name="identifier"
                  placeholder="you@example.com"
                  autoComplete="username"
                  value={form.identifier}
                  onChange={onChange}
                  className="h-11 border-border/70 bg-background/80 placeholder:text-muted-foreground/60 focus-visible:ring-primary/50"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label
                  htmlFor="auth-username"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Username
                </label>
                <Input
                  id="auth-username"
                  name="username"
                  placeholder="your_username"
                  autoComplete="username"
                  value={form.username}
                  onChange={onChange}
                  className="h-11 border-border/70 bg-background/80 placeholder:text-muted-foreground/60 focus-visible:ring-primary/50"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="auth-password"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Password
              </label>
              <div className="relative">
                <Input
                  id="auth-password"
                  name="password"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  value={form.password}
                  onChange={onChange}
                  className="h-11 border-border/70 bg-background/80 pr-11 placeholder:text-muted-foreground/60 focus-visible:ring-primary/50"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {mode === "register" ? (
              <>
                <div className="space-y-1.5">
                  <label
                    htmlFor="auth-confirm-password"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <Input
                      id="auth-confirm-password"
                      name="confirmPassword"
                      placeholder="••••••••"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={form.confirmPassword}
                      onChange={onChange}
                      className="h-11 border-border/70 bg-background/80 pr-11 placeholder:text-muted-foreground/60 focus-visible:ring-primary/50"
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? "Hide" : "Show"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Interests
                    </label>
                    <span
                      className={`text-xs font-semibold ${form.preferences.length >= 4 ? "text-emerald-500" : "text-muted-foreground"}`}
                    >
                      {form.preferences.length >= 4 ? (
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />{" "}
                          {form.preferences.length} selected
                        </span>
                      ) : (
                        `${form.preferences.length}/4 min`
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PREFERENCE_OPTIONS.map((item) => {
                      const selected = form.preferences.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              preferences: selected
                                ? prev.preferences.filter(
                                    (pref) => pref !== item,
                                  )
                                : [...prev.preferences, item],
                            }))
                          }
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                            selected
                              ? "border-primary/60 bg-primary text-primary-foreground shadow-sm"
                              : "border-border/70 bg-background/70 text-foreground/70 hover:border-primary/40 hover:bg-primary/8 hover:text-foreground"
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-red-300/40 bg-red-50/70 px-3 py-2.5 dark:border-red-900/40 dark:bg-red-950/20">
              <span className="mt-0.5 text-sm">⚠️</span>
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : null}

          <Button
            className="h-11 w-full text-sm font-semibold"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {mode === "login" ? "Signing in..." : "Creating account..."}
              </span>
            ) : mode === "login" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                >
                  Sign up free
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
};

export default Auth;
