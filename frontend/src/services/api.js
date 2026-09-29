const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

async function request(path, options = {}) {
  const token = localStorage.getItem("coal-india-limited-token");
  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof data === "object" && data?.message ? data.message : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  login: (credentials) => request("/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  uploadEvidence: (file) => request("/uploads", { method: "POST", body: (() => { const form = new FormData(); form.append("image", file); return form; })() }),
  getIssues: (params = "") => request(`/issues${params ? `?${params}` : ""}`),
  getIssue: (id) => request(`/issues/${encodeURIComponent(id)}`),
  getStats: () => request("/issues/stats"),
  getNearbyIssues: (params) => request(`/issues/nearby?${params}`),
  createIssue: (issue) => request("/issues", { method: "POST", body: JSON.stringify(issue) }),
  updateIssue: (id, payload) => request(`/issues/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteIssue: (id) => request(`/issues/${encodeURIComponent(id)}`, { method: "DELETE" })
};
