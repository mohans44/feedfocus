import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ExternalLink, LogOut, Lock, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  getAiSummary,
  getBookmarks,
  getMe,
  logoutUser,
  updatePreferences,
  updateProfile,
} from "../utils/api";

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

const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [message, setMessage] = useState("");
  const [activePanel, setActivePanel] = useState(null);
  const [aiLoadingId, setAiLoadingId] = useState(null);
  const [aiSummaryById, setAiSummaryById] = useState({});
  const [selectedPreferences, setSelectedPreferences] = useState([]);

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  });

  const { data: bookmarkData } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: getBookmarks,
  });

  const bookmarks = bookmarkData?.items || [];
  const preferences = useMemo(() => meData?.user?.preferences || [], [meData]);
  const username =
    meData?.user?.username ||
    meData?.user?.name ||
    (meData?.user?.email ? String(meData.user.email).split("@")[0] : "User");
  const isErrorMessage = message.toLowerCase().includes("failed");
  const hasMinPreferences = selectedPreferences.length >= 4;

  useEffect(() => {
    setSelectedPreferences(preferences);
  }, [preferences]);

  const togglePreference = (value) => {
    setSelectedPreferences((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const saveProfile = async () => {
    setMessage("");
    if (!password) {
      setMessage("Enter a new password.");
      return;
    }

    setSavingProfile(true);
    const result = await updateProfile({ password });
    setSavingProfile(false);

    if (!result.success) {
      setMessage(result.error || "Failed to update profile");
      return;
    }

    setPassword("");
    setMessage("Password updated.");
  };

  const savePreferences = async () => {
    setMessage("");
    if (!hasMinPreferences) {
      setMessage("Please select at least 4 preferences.");
      return;
    }
    setSavingPreferences(true);
    const result = await updatePreferences(selectedPreferences);
    setSavingPreferences(false);

    if (!result.success) {
      setMessage(result.error || "Failed to update preferences");
      return;
    }

    setMessage("Preferences updated.");
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    await queryClient.invalidateQueries({ queryKey: ["for-you"] });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 sm:space-y-5">
      <section className="rounded-3xl border border-border/80 bg-card/70 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">Hi, {username}</h1>
          </div>
          <Button
            variant="outline"
            className="w-full gap-2 sm:w-auto"
            onClick={async () => {
              await logoutUser();
              await queryClient.invalidateQueries({ queryKey: ["me"] });
              navigate("/tryit", { replace: true });
            }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2">
            <p className="text-xs text-muted-foreground">Bookmarks</p>
            <p className="text-sm font-semibold">{bookmarks.length}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2">
            <p className="text-xs text-muted-foreground">Preferences</p>
            <p className="text-sm font-semibold">{preferences.length}</p>
          </div>
        </div>
      </section>

      {message ? (
        <p className={`text-sm ${isErrorMessage ? "text-red-500" : "text-primary"}`}>{message}</p>
      ) : null}

      <section className="rounded-3xl border border-border/80 bg-card/70 p-4 sm:p-5">
        <h2 className="text-sm font-semibold sm:text-base">Manage Profile</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={activePanel === "password" ? "default" : "outline"}
            onClick={() => setActivePanel((prev) => (prev === "password" ? null : "password"))}
          >
            Change password
          </Button>
          <Button
            size="sm"
            variant={activePanel === "preferences" ? "default" : "outline"}
            onClick={() => {
              setSelectedPreferences(preferences);
              setActivePanel((prev) => (prev === "preferences" ? null : "preferences"));
            }}
          >
            Edit preferences
          </Button>
        </div>

        {activePanel === "password" ? (
          <div className="mt-3 space-y-3 rounded-2xl border border-border/70 bg-background/60 p-3 sm:p-4">
            <label className="text-xs font-medium text-muted-foreground">Change password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="New password"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={saveProfile} disabled={savingProfile} className="w-full sm:w-auto">
                {savingProfile ? "Saving..." : "Update password"}
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setPassword("");
                  setActivePanel(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {activePanel === "preferences" ? (
          <div className="mt-3 rounded-2xl border border-border/70 bg-background/60 p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Edit Preferences</h3>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Choose your default topics.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Selected: {selectedPreferences.length} (minimum 4)
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PREFERENCE_OPTIONS.map((item) => {
                const selected = selectedPreferences.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => togglePreference(item)}
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
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                onClick={savePreferences}
                disabled={savingPreferences || !hasMinPreferences}
                className="w-full sm:w-auto"
              >
                {savingPreferences ? "Saving..." : "Save preferences"}
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setSelectedPreferences(preferences);
                  setActivePanel(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-border/80 bg-card/70 p-4 sm:p-5">
        <h2 className="text-sm font-semibold sm:text-base">Bookmarks</h2>
        {!bookmarks.length ? (
          <p className="mt-2 text-sm text-muted-foreground">No bookmarks yet.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:gap-4">
            {bookmarks.map((article, index) => (
              <article
                key={`${article._id || article.url || article.title}-${index}`}
                className="rounded-2xl border border-border/70 bg-background/70 p-3 sm:p-4"
              >
                <h3 className="line-clamp-3 text-sm font-semibold sm:text-base">{article.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{article.publisher}</p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {article.url ? (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      Read source
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-full border border-primary/50 px-2.5 py-1 text-[11px] font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-60"
                    disabled={aiLoadingId === article._id}
                    onClick={async () => {
                      if (!article._id || (aiSummaryById[article._id] && !aiSummaryById[article._id].error)) {
                        return;
                      }
                      setAiLoadingId(article._id);
                      const data = await getAiSummary(article._id);
                      setAiSummaryById((prev) => ({ ...prev, [article._id]: data }));
                      setAiLoadingId(null);
                    }}
                  >
                    {aiLoadingId === article._id
                      ? "Generating..."
                      : aiSummaryById[article._id]?.error
                        ? "Retry AI summary"
                        : "Show AI summary"}
                  </button>
                </div>

                {article._id && aiSummaryById[article._id]?.summary ? (
                  <div className="mt-2 rounded-xl border border-border/80 bg-card/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      1-minute AI summary • {aiSummaryById[article._id].category || article.primaryCategory || "world"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{aiSummaryById[article._id].summary}</p>
                  </div>
                ) : null}

                {article._id && aiSummaryById[article._id]?.error ? (
                  <p className="mt-2 text-xs text-red-500">Failed to load AI summary: {aiSummaryById[article._id].error}</p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Profile;
