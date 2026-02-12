import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
      <Card className="glass top-sheen w-full max-w-lg">
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-muted-foreground">
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
              />
            ) : (
              <Input
                name="username"
                placeholder="Username"
                value={form.username}
                onChange={onChange}
              />
            )}
            <Input
              name="password"
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={onChange}
            />
            {mode === "register" ? (
              <>
                <Input
                  name="confirmPassword"
                  placeholder="Confirm password"
                  type="password"
                  value={form.confirmPassword}
                  onChange={onChange}
                />
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Select preferences (min 4)</p>
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
                  <p className="text-xs text-muted-foreground">Selected: {form.preferences.length}</p>
                </div>
              </>
            ) : null}
            {error ? (
              <p className="text-xs text-red-400">{error}</p>
            ) : null}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading
                ? "Submitting..."
                : mode === "login"
                ? "Sign in"
                : "Create account"}
            </Button>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <button
                type="button"
                className="text-foreground underline underline-offset-4"
                onClick={() => setMode("register")}
              >
                New here? Create an account.
              </button>
            ) : (
              <button
                type="button"
                className="text-foreground underline underline-offset-4"
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
