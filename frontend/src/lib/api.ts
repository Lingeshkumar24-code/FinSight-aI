// Base path for every API call. Vite's dev server proxies `/api` to the
// backend, so every call is resolved relative to the served origin and
// forwarded to the backend — no hardcoded host/port the browser must reach.
const API_PREFIX = "/api/v1";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
  if (token) {
    localStorage.setItem("finsight_token", token);
  } else {
    localStorage.removeItem("finsight_token");
  }
}

export function loadStoredToken(): string | null {
  const stored = localStorage.getItem("finsight_token");
  authToken = stored;
  return stored;
}

async function request<TResponse>(
  path: string,
  options: RequestInit = {}
): Promise<TResponse> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  const resp = await fetch(`${API_PREFIX}/${path}`.replace("//", "/"), { ...options, headers });

  if (!resp.ok) {
    let detail = resp.statusText;
    try {
      const body = await resp.json();
      detail = body.detail ?? detail;
    } catch {
      // response wasn't JSON; fall back to statusText
    }
    throw new ApiError(resp.status, typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  const contentType = resp.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await resp.json()) as TResponse;
  }
  return (await resp.blob()) as unknown as TResponse;
}

// --- Types ---

export interface LoginResponse {
  access_token: string;
  token_type: string;
  business_id: string;
}

export interface RatioOut {
  name: string;
  value: number | null;
  interpretation: string;
}

export interface RiskFlagOut {
  code: string;
  message: string;
  level: string;
  metric_value: number | null;
}

export interface RiskResponse {
  overall_score: number;
  overall_level: string;
  flags: RiskFlagOut[];
}

export interface AdvisorResponse {
  intent: string;
  route: string;
  is_valid: boolean;
  tool_result: Record<string, unknown>;
  citations: string[];
  validation_notes: string[];
  answer: string;
}

export interface SimulationPeriodOut {
  period_index: number;
  revenue: number;
  costs: number;
  net_income: number;
  cash_balance: number;
}

export interface WhatIfResponse {
  periods: SimulationPeriodOut[];
  ending_cash: number;
  breakeven_period: number | null;
}

export interface DocumentUploadResponse {
  document_id: string;
  source: string;
  chunks_indexed: number;
}

// --- API surface ---

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getRatios: (balanceSheet: Record<string, number>, incomeStatement: Record<string, number>) =>
    request<{ ratios: RatioOut[] }>("/financials/ratios", {
      method: "POST",
      body: JSON.stringify({ balance_sheet: balanceSheet, income_statement: incomeStatement }),
    }),

  getRisk: (inputs: Record<string, number | null>) =>
    request<RiskResponse>("/financials/risk", {
      method: "POST",
      body: JSON.stringify(inputs),
    }),

  askAdvisor: (query: string, extractedParams: Record<string, unknown> = {}) =>
    request<AdvisorResponse>("/advisor/ask", {
      method: "POST",
      body: JSON.stringify({ query, extracted_params: extractedParams }),
    }),

  simulateWhatIf: (payload: {
    starting_revenue: number;
    starting_costs: number;
    starting_cash: number;
    levers: Record<string, number>;
    periods: number;
  }) =>
    request<WhatIfResponse>("/simulator/what-if", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  uploadDocument: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<DocumentUploadResponse>("/documents/upload", {
      method: "POST",
      body: formData,
    });
  },

  generateReport: (payload: {
    business_name: string;
    period: string;
    ratios: RatioOut[];
    risk?: RiskResponse;
    notes: string;
  }) =>
    request<Blob>("/reports/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getAlerts: () => request<AlertItem[]>("/alerts"),

  triggerAlertCheck: () =>
    request<{
      status: string;
      alerts_generated: number;
      n8n_webhook_dispatched: boolean;
      alerts: AlertItem[];
    }>("/alerts/trigger-check", {
      method: "POST",
    }),

  markAlertRead: (alertId: string) =>
    request<AlertItem>(`/alerts/${alertId}/read`, {
      method: "POST",
    }),

  dismissAlert: (alertId: string) =>
    request<{ status: string; alert_id: string }>(`/alerts/${alertId}`, {
      method: "DELETE",
    }),
};

export interface AlertItem {
  id: string;
  business_id: string;
  title: string;
  message: string;
  severity: "info" | "watch" | "critical" | "low";
  source: string;
  timestamp: string;
  read: boolean;
}

