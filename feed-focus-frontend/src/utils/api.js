import axios from "axios";

const API_BASE_URL = import.meta.env.PROD
  ? ""
  : import.meta.env.VITE_API_BASE_URL || "";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 15000,
});

const handleRequest = async (request) => {
  try {
    const res = await request();
    return { success: true, data: res.data };
  } catch (err) {
    return {
      success: false,
      error: err?.response?.data?.error || err.message || "Unknown error",
    };
  }
};

export const getArticles = (params = {}) =>
  handleRequest(() => api.get("/api/articles", { params })).then((res) =>
    res.success ? res.data : { items: [], nextCursor: null, error: res.error }
  );

export const getForYou = (params = {}) =>
  handleRequest(() => api.get("/api/recommendations/for-you", { params })).then(
    (res) => (res.success ? res.data : { items: [], error: res.error })
  );

export const loginUser = (credentials) =>
  handleRequest(() => api.post("/api/auth/login", credentials));

export const registerUser = (userData) =>
  handleRequest(() => api.post("/api/auth/register", userData));

export const logoutUser = () => handleRequest(() => api.post("/api/auth/logout"));

export const getMe = () =>
  handleRequest(() => api.get("/api/users/me")).then((res) =>
    res.success ? res.data : null
  );

export const updatePreferences = (preferences) =>
  handleRequest(() => api.put("/api/users/preferences", { preferences }));

export const updateProfile = (payload) =>
  handleRequest(() => api.put("/api/users/me", payload));

export const getBookmarks = () =>
  handleRequest(() => api.get("/api/users/bookmarks")).then((res) =>
    res.success ? res.data : { items: [] }
  );

export const addBookmark = (articleId) =>
  handleRequest(() => api.post("/api/users/bookmarks", { articleId }));

export const removeBookmark = (articleId) =>
  handleRequest(() => api.delete(`/api/users/bookmarks/${articleId}`));

export const getAiSummary = (articleId, { force = false } = {}) =>
  handleRequest(() =>
    api.get(`/api/articles/${articleId}/ai-summary`, {
      params: force ? { force: 1 } : undefined,
    })
  ).then((res) =>
    res.success
      ? res.data
      : { articleId, summary: "", keyPoints: [], error: res.error || "Failed to load summary" }
  );
