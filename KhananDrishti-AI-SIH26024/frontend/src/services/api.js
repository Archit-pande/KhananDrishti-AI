const DEVELOPMENT_API_URL = "http://localhost:5000/api";
const PRODUCTION_API_URL = "https://khanandrishti-ai.onrender.com/api";
const PROXY_API_URL = "/api";
const configuredApiUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function baseUrls() {
  if (import.meta.env.DEV) {
    return unique([configuredApiUrl || DEVELOPMENT_API_URL, DEVELOPMENT_API_URL]);
  }

  const safeConfiguredUrl = (() => {
    if (!configuredApiUrl) return null;
    if (configuredApiUrl === PROXY_API_URL) return PROXY_API_URL;
    try {
      const url = new URL(configuredApiUrl);
      return url.hostname === "khanandrishti-ai.onrender.com" ? configuredApiUrl : null;
    } catch {
      return null;
    }
  })();

  return unique([safeConfiguredUrl, PRODUCTION_API_URL, PROXY_API_URL]);
}

function buildUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function fetchOnce(baseUrl, path, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const token = localStorage.getItem("khanandrishti-ai-token");
  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    return await fetch(buildUrl(baseUrl, path), {
      ...options,
      headers,
      signal: options.signal || controller.signal,
      cache: "no-store",
      mode: "cors"
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("request_timeout");
    }
    throw new Error("network_error");
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function decodeResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (response.status === 204) return null;

  const raw = await response.text();
  if (!raw) return null;

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  return raw;
}

async function request(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const urls = baseUrls();
  const candidates = ["GET", "HEAD", "OPTIONS"].includes(method) ? urls : urls.slice(0, 1);
  const timeoutMs = 70000;
  let lastError = null;

  for (const baseUrl of candidates) {
    try {
      const response = await fetchOnce(baseUrl, path, options, timeoutMs);
      const data = await decodeResponse(response);

      if (!response.ok) {
        const message = typeof data === "object" && data?.message
          ? data.message
          : `Request failed with status ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        throw error;
      }

      return data;
    } catch (error) {
      lastError = error;
      if (error?.status && error.status < 500) throw error;
    }
  }

  if (lastError?.message === "request_timeout") {
    throw new Error("The KhananDrishti AI backend is waking up or taking too long to respond.");
  }

  throw new Error("Unable to reach the KhananDrishti AI backend. Please try again in a few seconds.");
}

export const api = {
  login: (credentials) => request("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials)
  }),
  register: (payload) => request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  uploadEvidence: (file) => {
    const form = new FormData();
    form.append("image", file);
    return request("/uploads", {
      method: "POST",
      body: form
    });
  },
  getIssues: (params = "") => request(`/issues${params ? `?${params}` : ""}`),
  getIssue: (id) => request(`/issues/${encodeURIComponent(id)}`),
  getStats: () => request("/issues/stats"),
  getNearbyIssues: (params = "") => request(`/issues/nearby${params ? `?${params}` : ""}`),
  createIssue: (issue) => request("/issues", {
    method: "POST",
    body: JSON.stringify(issue)
  }),
  updateIssue: (id, payload) => request(`/issues/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  }),
  deleteIssue: (id) => request(`/issues/${encodeURIComponent(id)}`, {
    method: "DELETE"
  }),
  getAIInsights: () => request("/ai/insights"),
  askAI: (question) => request("/ai/ask", {
    method: "POST",
    body: JSON.stringify({ question })
  }),
  health: () => request("/health")
};
