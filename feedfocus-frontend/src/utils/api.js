import axios from "axios";

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");
const AUTH_TOKEN_KEY = "ff_auth_token";

const getStoredToken = () => {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || "";
  } catch {
    return "";
  }
};

const setStoredToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      return;
    }
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Ignore storage failures; cookie auth can still work.
  }
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      setStoredToken("");
    }
    return Promise.reject(error);
  },
);

const handleRequest = async (request) => {
  try {
    const res = await request();
    return { success: true, data: res.data };
  } catch (err) {
    return {
      success: false,
      status: err?.response?.status || null,
      error: err?.response?.data?.error || err.message || "Unknown error",
    };
  }
};

export const getArticles = (params = {}) =>
  handleRequest(() => api.get("/api/articles", { params })).then((res) =>
    res.success ? res.data : { items: [], nextCursor: null, error: res.error },
  );

export const getArticleById = (articleId) =>
  handleRequest(() => api.get(`/api/articles/${articleId}`)).then((res) =>
    res.success ? res.data : { item: null, error: res.error },
  );

export const getAiCorrectedArticle = (articleId, { force = false } = {}) =>
  handleRequest(() =>
    api.get(`/api/articles/${articleId}/ai-corrected`, {
      params: force ? { force: 1 } : undefined,
    }),
  ).then((res) =>
    res.success
      ? res.data
      : {
          articleId,
          correctedTitle: "",
          correctedContent: "",
          highlights: [],
          error: res.error || "Failed to load AI-corrected article",
        },
  );

export const getForYou = (params = {}) =>
  handleRequest(() => api.get("/api/recommendations/for-you", { params })).then(
    (res) => (res.success ? res.data : { items: [], error: res.error }),
  );

export const loginUser = (credentials) =>
  handleRequest(() => api.post("/api/auth/login", credentials)).then((res) => {
    if (res.success) {
      setStoredToken(res.data?.token || "");
    }
    return res;
  });

export const registerUser = (userData) =>
  handleRequest(() => api.post("/api/auth/register", userData)).then((res) => {
    if (res.success) {
      setStoredToken(res.data?.token || "");
    }
    return res;
  });

export const logoutUser = () =>
  handleRequest(() => api.post("/api/auth/logout")).then((res) => {
    setStoredToken("");
    return res;
  });

export const getMe = () =>
  handleRequest(() => api.get("/api/users/me")).then((res) => {
    if (res.success) {
      return res.data;
    }
    if (res.status === 401) {
      setStoredToken("");
    }
    return null;
  });

export const updatePreferences = (preferences) =>
  handleRequest(() => api.put("/api/users/preferences", { preferences }));

export const updateProfile = (payload) =>
  handleRequest(() => api.put("/api/users/me", payload));

export const getBookmarks = () =>
  handleRequest(() => api.get("/api/users/bookmarks")).then((res) =>
    res.success ? res.data : { items: [] },
  );

export const addBookmark = (articleId) =>
  handleRequest(() => api.post("/api/users/bookmarks", { articleId }));

export const removeBookmark = (articleId) =>
  handleRequest(() => api.delete(`/api/users/bookmarks/${articleId}`));

export const getAiSummary = (articleId, { force = false } = {}) =>
  handleRequest(() =>
    api.get(`/api/articles/${articleId}/ai-summary`, {
      params: force ? { force: 1 } : undefined,
    }),
  ).then((res) =>
    res.success
      ? res.data
      : {
          articleId,
          summary: "",
          keyPoints: [],
          error: res.error || "Failed to load summary",
        },
  );
