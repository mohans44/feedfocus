import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { getMe, loginUser, registerUser } from "../utils/api";

const PREFERENCE_OPTIONS = [
  "india",
  "world",
  "technology",
  "business",
  "science",
  "health",
  "sports",
  "entertainment",
  "food",
  "fashion",
  "travel",
];

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
    const result = mode === "login"
      ? await loginUser({ identifier: form.identifier, password: form.password })
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
    <div className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center">
      <Card className="w-full max-w-lg border-border/85 bg-background/95">
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="space-y-2">
            <div className="inline-flex rounded-lg border border-border/80 bg-card p-1">
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  mode === "login"
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/75 hover:bg-muted"
                }`}
                onClick={() => setMode("login")}
              >
                Sign in
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  mode === "register"
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/75 hover:bg-muted"
                }`}
                onClick={() => setMode("register")}
              >
                Create account
              </button>
            </div>
            <h1 className="text-2xl sm:text-3xl">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-foreground/75">
              One secure login keeps your feed tuned for 30 days.
            </p>
          </div>
          <div className="space-y-4">
            {mode === "login" ? (
              <Input
                name="identifier"
                placeholder="Username or email"
                value={form.identifier}
                onChange={onChange}
                className={authInputClass}
              />
            ) : (
              <Input
                name="username"
                placeholder="Username"
                value={form.username}
                onChange={onChange}
                className={authInputClass}
              />
            )}
            <div className="relative">
              <Input
                name="password"
                placeholder="Password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={onChange}
                className={`${authInputClass} pr-10`}
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
            {mode === "register" ? (
              <>
                <div className="relative">
                  <Input
                    name="confirmPassword"
                    placeholder="Confirm password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={onChange}
                    className={`${authInputClass} pr-10`}
                  />
                  <button
                    type="button"
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
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
                <div className="space-y-2">
                  <p className="text-xs text-foreground/70">Select preferences (min 4)</p>
                  <div className="flex flex-wrap gap-2">
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
                                ? prev.preferences.filter((pref) => pref !== item)
                                : [...prev.preferences, item],
                            }))
                          }
                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            selected
                              ? "border-primary/60 bg-primary text-primary-foreground"
                              : "border-border/80 bg-background text-foreground hover:bg-muted"
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-foreground/70">Selected: {form.preferences.length}</p>
                </div>
              </>
            ) : null}
            {error ? (
              <p className="text-xs text-red-500">{error}</p>
            ) : null}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading
                ? "Submitting..."
                : mode === "login"
                ? "Sign in"
                : "Create account"}
            </Button>
          </div>
          <div className="text-center text-sm text-foreground/75">
            {mode === "login" ? (
              <button
                type="button"
                className="text-primary underline underline-offset-4"
                onClick={() => setMode("register")}
              >
                New here? Create an account.
              </button>
            ) : (
              <button
                type="button"
                className="text-primary underline underline-offset-4"
                onClick={() => setMode("login")}
              >
                Already have an account? Sign in.
              </button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Auth;
