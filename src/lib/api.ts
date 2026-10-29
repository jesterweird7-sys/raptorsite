/** Типизированный клиент API приложения. Контракт — `/app/api`: все ответы и
 *  ошибки приходят в одном виде `{ error: { kind, message, retryable } }`,
 *  а формы данных описаны типами ниже. Локально его подменяет `npm run mock`. */

const BASE = "/app/api";
const TOKEN_KEY = "raptor.session";

export type ApiError = { kind: string; message: string; retryable: boolean };

export class RequestError extends Error {
  kind: string;
  retryable: boolean;
  status: number;
  constructor(status: number, err: ApiError | undefined, fallback: string) {
    super(err?.message || fallback);
    this.kind = err?.kind || "generic";
    this.retryable = err?.retryable ?? false;
    this.status = status;
  }
}

export type Pick = {
  marketKey: string;
  market: string;
  probability: number;
  odds: number | null;
  fairOdds: number | null;
  evPct: number;
  kellyUnits: number;
  verdict: string;
  strength: number;
  reason?: string;
};

export type MarketRow = {
  key: string;
  label: string;
  probability: number;
  odds: number | null;
  fairOdds: number | null;
  evPct: number | null;
};

export type MatchItem = {
  gameId: number;
  home: string;
  away: string;
  league: string;
  country: string;
  dateIso: string;
  time: string;
  status: string;
  pick: Pick | null;
};

export type Collection = { id: string; title: string; hint: string; count: number; items: MatchItem[] };

export type MatchDetail = {
  gameId: number;
  home: string;
  away: string;
  league: string;
  country: string;
  time: string;
  status: string;
  isLive: boolean;
  isFinished: boolean;
  scoreHome: number | null;
  scoreAway: number | null;
  markets: MarketRow[];
  groups: { id: string; title: string; markets: MarketRow[] }[];
  topScores: { home: number; away: number; probability: number }[];
  pick: Pick | null;
  ai: { text: string } | null;
  h2h: unknown;
  passport: Record<string, unknown> | null;
  dataSufficient: boolean;
};

export type Session = {
  token?: string;
  user: { tgId: number; name: string; username: string; language: string };
  subscription: { plan: string; active: boolean; until: string | null; dailyLimit: number };
  quota: { freeLeft: number; bonus: number; usedToday: number; unlimited: boolean };
  band: { min: number; max: number };
  mode: string;
  admin: { allowed: boolean; unlocked: boolean };
  source: { configured: boolean; baseUrl: string; lastError: string | null; externalAllowed: boolean };
  startParam?: string;
};

export type Job = {
  id: string;
  kind: string;
  label: string;
  stage: string;
  done: number;
  total: number;
  pct: number;
  status: "running" | "done" | "error" | "cancelled";
  result: Record<string, unknown> | null;
  error: string | null;
  elapsed: number;
};

export type HistoryRow = {
  gameId: number;
  date: string;
  match: string;
  league: string;
  market: string;
  verdict: string;
  probability: number;
  odds: number;
  hit: boolean | null;
  status: string;
  profit: number;
  score: string | null;
};

export type JournalRow = {
  id: number;
  date: string;
  match: string;
  market: string;
  odds: number;
  stake: number;
  status: string;
  profit: number;
  tag: string;
  reason: string;
};

export type JournalStats = {
  total: number;
  settled: number;
  won: number;
  hitRate: number;
  profit: number;
  roi: number;
  avgOdds: number;
  staked: number;
  pending: number;
};

/* ── живой сканер: табло, карточка, сигналы, настройки ───────────── */

export type LiveSignal = {
  scenario: string;
  title: string;
  market: string;
  odds: number;
  probability: number;
  evPct: number;
  priority: string;
  reasons: string[];
  confirmedBy: string[];
  untilMinute: number;
  validMinutes: number;
  noBet: boolean;
  noBetReason: string;
};

export type LiveRow = {
  gameId: number;
  home: string;
  away: string;
  league: string;
  country: string;
  countryCode: string;
  score: string;
  minute: number;
  period: string;
  kickoff: string;
  hotness: number;
  stats: boolean;
  metrics: string[];
  sot: string;
  shots: string;
  corners: string;
  xg: string;
  pi: string;
  gsi: number;
  signal: LiveSignal | null;
  near: string[];
  watched: boolean;
  dataState: string;
  dataNote: string;
};

export type LiveBoard = {
  updated: string;
  ageSeconds: number;
  live: number;
  covered: number;
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  filters: Record<string, any>;
  rows: LiveRow[];
  latestSignal?: number;
};

export type LiveGame = {
  gameId: number;
  source: string;
  stale: boolean;
  ageSeconds: number;
  passport: Record<string, any>;
  quality: { state: string; note: string };
  signal: LiveSignal | null;
  numbers: Record<string, string>;
  gsi: number;
  hotness: number;
  goalBasis: Record<string, any>;
  scenarios: {
    id: string;
    title: string;
    status: string;
    progress: number;
    fired: boolean;
    matched: string[];
    barriers: string[];
  }[];
  events: { kind: string; minute: number; side: string; red: boolean; player: string }[];
  watched: boolean;
  text: string;
};

export type LiveSignalRow = {
  id: number;
  gameId: number;
  scenario: string;
  title: string;
  priority: string;
  market: string;
  minute: number;
  score: string;
  league: string;
  home: string;
  away: string;
  probability: number;
  odds: number;
  evPct: number;
  verdict: string;
  delivered: boolean;
  pushed: boolean;
  hit: boolean | null;
  fact: string;
  reason: string;
  ageSeconds: number;
};

export type LiveLog = {
  items: LiveSignalRow[];
  summary: { total: number; processed: number; pushed: number; resolved: number; hitRate: number };
};

export type LiveFilters = {
  minute_from: number;
  minute_to: number;
  only_stats: boolean;
  min_hotness: number;
  sort: string;
  page: number;
  countries: string[];
  leagues: string[];
  hidden: string[];
};

export type LiveSubscription = {
  enabled: boolean;
  min_priority: string;
  by_filters: boolean;
  min_gap_sec: number;
  scenarios_off: string[];
  events: Record<string, boolean>;
};

export type LiveScenario = {
  id: string;
  title: string;
  priority: string;
  validMinutes: number;
  note: string;
};

export type LiveAdmin = {
  state: Record<string, any>;
  calibration: Record<string, any>;
};

export type PublicResultRow = {
  game_id: number;
  match: string;
  league: string;
  market: string;
  verdict: string;
  probability_percent: string;
  odds: number | null;
  edge_percent: string;
  kickoff: string;
  published_at: string | null;
  resolved_at: string | null;
  outcome: "hit" | "miss" | null;
  result_published: boolean;
};

export type PublicResults = {
  generated_at: string;
  items: PublicResultRow[];
  stats: {
    published: number;
    resolved: number;
    hits: number;
    hit_rate_percent: number | null;
    roi_percent: number | null;
    flat_units: number;
    take_resolved?: number;
    take_hits?: number;
  };
};

export type Plan = { code: string; title: string; days: number; stars: number; usdt: number; rub: number; hint: string; badge: string };
export type AdminUser = {
  id: number;
  tgId: number;
  name: string;
  username: string;
  plan: string;
  until: string;
  free: number;
  bonus: number;
  bank: number;
  blocked: boolean;
  admin: boolean;
};
export type RuntimeSetting = {
  key: string;
  title: string;
  category: string;
  kind: string;
  value: string;
  raw: unknown;
  min: number | null;
  max: number | null;
  choices: string[];
  hot: boolean;
  description: string;
};

export function savedToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function saveToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* приватный режим — проживём до перезагрузки */
  }
}

type FetchInit = Omit<RequestInit, "body"> & { body?: unknown; query?: Record<string, string | number | undefined> };

async function call<T>(path: string, init: FetchInit = {}, auth = true): Promise<T> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(init.query || {})) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  const headers: Record<string, string> = { Accept: "application/json", ...(init.headers as Record<string, string>) };
  if (auth) {
    const token = savedToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let body: BodyInit | undefined;
  if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.body);
  }
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}${qs ? `?${qs}` : ""}`, { ...init, headers, body });
  } catch {
    throw new RequestError(0, { kind: "network", message: "Нет связи с сервером", retryable: true }, "нет связи");
  }
  if (response.status === 401 && auth) {
    saveToken("");
    throw new RequestError(401, undefined, "нужно открыть приложение из бота");
  }
  if (!response.ok) {
    let err: ApiError | undefined;
    try {
      const payload = await response.json();
      err = payload?.error ?? (payload?.detail ? { kind: "generic", message: String(payload.detail), retryable: false } : undefined);
    } catch {
      /* тело не JSON */
    }
    throw new RequestError(response.status, err, `ошибка ${response.status}`);
  }
  return (await response.json()) as T;
}

export const api = {
  session: (initData: string) => call<Session>("/session", { method: "POST", body: { initData } }, false),
  me: () => call<Session>("/me"),
  day: (day: string) => call<{ items: MatchItem[] }>(`/day`, { query: { day } }),
  collections: (day: string) => call<{ day: string; total: number; withPick: number; collections: Collection[] }>(`/collections`, { query: { day } }),
  match: (gameId: number) => call<{ cached: boolean; data: MatchDetail | null }>(`/match/${gameId}`),
  predict: (gameId: number) => call<{ jobId: string }>(`/match/${gameId}/predict`, { method: "POST" }),
  job: (id: string) => call<Job>(`/jobs/${id}`),
  cancelJob: (id: string) => call<{ cancelled: boolean }>(`/jobs/${id}/cancel`, { method: "POST" }),
  history: (q: { verdict?: string; days?: number; league?: string }) =>
    call<{ rows: HistoryRow[]; summary: { total: number; settled: number; won: number; hitRate: number; profit: number; roi: number } }>(
      `/history`,
      { query: { ...q } },
    ),
  journal: () => call<{ rows: JournalRow[]; stats: JournalStats }>(`/journal`),
  journalAdd: (payload: Record<string, unknown>) => call<{ id: number }>(`/journal`, { method: "POST", body: payload }),
  journalResolve: (id: number, status: string) =>
    call<{ ok: boolean }>(`/journal/${id}/resolve`, { method: "POST", query: { status } }),
  plans: () => call<{ items: Plan[] }>(`/plans`),
  publicPlans: () => call<{ items: Plan[] }>(`/public/plans`, {}, false),
  publicResults: (limit = 30) =>
    call<PublicResults>(`/public/results`, { query: { limit } }, false),
  subscribe: (plan: string) => call<{ url: string; plan: string; amount: number }>(`/subscribe`, { method: "POST", body: { plan } }),
  referral: () => call<{ code: string; link: string; total: number; paid: number; bonus: number }>(`/referral`),
  setBand: (min: number | null, max: number | null) => call<{ min: number | null; max: number | null }>(`/band`, { method: "PATCH", body: { min, max } }),
  scanner: {
    board: (page?: number) => call<LiveBoard>(`/scanner/board`, { query: { page } }),
    game: (gameId: number) => call<LiveGame>(`/scanner/game/${gameId}`),
    signals: (limit = 40) => call<LiveLog>(`/scanner/signals`, { query: { limit } }),
    filters: () => call<LiveFilters>(`/scanner/filters`),
    setFilters: (patch: Record<string, unknown>) => call<LiveFilters>(`/scanner/filters`, { method: "PATCH", body: patch }),
    subscription: () => call<LiveSubscription>(`/scanner/subscription`),
    scenarios: () => call<{ items: LiveScenario[] }>(`/scanner/scenarios`),
    setSubscription: (patch: Record<string, unknown>) =>
      call<LiveSubscription>(`/scanner/subscription`, { method: "PATCH", body: patch }),
    watch: (gameId: number, on: boolean) =>
      call<{ watched: boolean; gameId: number }>(`/scanner/watch`, { method: "POST", body: { gameId, on } }),
    streamUrl: (page?: number) =>
      `${BASE}/scanner/stream?t=${encodeURIComponent(savedToken())}${page !== undefined && page >= 0 ? `&page=${page}` : ""}`,
    admin: () => call<LiveAdmin>(`/admin/scanner`),
  },
  admin: {
    unlock: (password: string) => call<{ unlocked: boolean; reason?: string }>(`/admin/unlock`, { method: "POST", body: { password } }),
    dashboard: () => call<Record<string, any>>(`/admin/dashboard`),
    users: (q: string) => call<{ items: AdminUser[] }>(`/admin/users`, { query: { q } }),
    userAction: (tgId: number, action: string, amount = 0) =>
      call<Record<string, unknown>>(`/admin/users/${tgId}/action`, { method: "POST", body: { action, amount } }),
    settings: () => call<{ items: RuntimeSetting[] }>(`/admin/settings`),
    setSetting: (key: string, value: unknown) => call<{ key: string; value: string }>(`/admin/settings`, { method: "POST", body: { key, value } }),
    toggleSetting: (key: string) => call<{ key: string; value: boolean }>(`/admin/settings/toggle`, { method: "POST", body: { key } }),
    source: () => call<Record<string, unknown>>(`/admin/source`),
    mass: (day: string) => call<{ jobId: string }>(`/admin/jobs/mass`, { method: "POST", body: { day } }),
  },
};
