const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

let accessToken: string | null = null;

export function setToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem("luminary_token", token);
  } else {
    localStorage.removeItem("luminary_token");
  }
}

export function getToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== "undefined") {
    accessToken = localStorage.getItem("luminary_token");
  }
  return accessToken;
}

export function clearToken() {
  accessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("luminary_token");
  }
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error ${res.status}`);
  }

  if (res.status === 204) return null as T;
  return res.json();
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: { id: number; email: string };
}

export async function register(email: string, password: string) {
  const data = await apiFetch<AuthResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
  return data;
}

export async function login(email: string, password: string) {
  const data = await apiFetch<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
  return data;
}

export async function logout() {
  await apiFetch("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
  clearToken();
}

export async function getMe() {
  return apiFetch<{ id: number; email: string }>("/api/v1/auth/me");
}

// ---------------------------------------------------------------------------
// Sites API
// ---------------------------------------------------------------------------

export interface SiteData {
  id: number;
  name: string;
  domain: string;
  public_token: string;
  site_id: string;
  created_at: string;
}

export async function createSite(name: string, domain: string) {
  return apiFetch<SiteData>("/api/v1/sites", {
    method: "POST",
    body: JSON.stringify({ name, domain }),
  });
}

export async function listSites() {
  return apiFetch<SiteData[]>("/api/v1/sites");
}

export async function getSite(siteId: string) {
  return apiFetch<SiteData>(`/api/v1/sites/${siteId}`);
}

export async function getSnippet(siteId: string) {
  return apiFetch<{ snippet: string; public_token: string }>(
    `/api/v1/sites/${siteId}/snippet`
  );
}

// ---------------------------------------------------------------------------
// Stats API
// ---------------------------------------------------------------------------

export async function fetchSummary(siteId: string, days = 7) {
  return apiFetch(`/api/v1/stats/summary?site_id=${siteId}&days=${days}`);
}

export async function fetchTimeseries(siteId: string, days = 7) {
  return apiFetch(`/api/v1/stats/timeseries?site_id=${siteId}&days=${days}`);
}

export async function fetchPages(siteId: string, days = 7) {
  return apiFetch(`/api/v1/stats/pages?site_id=${siteId}&days=${days}`);
}

export async function fetchReferrers(siteId: string, days = 7) {
  return apiFetch(`/api/v1/stats/referrers?site_id=${siteId}&days=${days}`);
}

export async function fetchDevices(siteId: string, days = 7) {
  return apiFetch(`/api/v1/stats/devices?site_id=${siteId}&days=${days}`);
}

export async function fetchBrowsers(siteId: string, days = 7) {
  return apiFetch(`/api/v1/stats/browsers?site_id=${siteId}&days=${days}`);
}

export async function fetchCountries(siteId: string, days = 7) {
  return apiFetch(`/api/v1/stats/countries?site_id=${siteId}&days=${days}`);
}

// ---------------------------------------------------------------------------
// Realtime API
// ---------------------------------------------------------------------------

export async function fetchActiveUsers(siteId: string) {
  return apiFetch<{ active_visitors: number }>(
    `/api/v1/realtime/active?site_id=${siteId}`
  );
}

export function getRealtimeStreamUrl(siteId: string) {
  return `${API_URL}/api/v1/realtime/stream?site_id=${siteId}`;
}
