import { create } from "zustand";
import {
  api,
  RequestError,
  saveToken,
  savedToken,
  type AdminUser,
  type Collection,
  type HistoryRow,
  type Job,
  type JournalRow,
  type JournalStats,
  type MatchDetail,
  type MatchItem,
  type RuntimeSetting,
  type Session,
} from "../lib/api";
import { rawInitData } from "../lib/telegram";

export type Notice = { text: string; tone: "error" | "ok" | "info" };

type State = {
  boot: "loading" | "ready" | "error";
  bootError: string;
  session: Session | null;
  notice: Notice | null;

  day: string;
  feed: MatchItem[];
  collections: Collection[];
  dayTotal: number;
  withPick: number;
  loadingFeed: boolean;
  feedError: string | null;

  detail: Record<number, MatchDetail | null>;
  detailBusy: number | null;
  job: Job | null;

  historyRows: HistoryRow[];
  historySummary: { total: number; settled: number; won: number; hitRate: number; profit: number; roi: number } | null;
  historyFilters: { verdict: string; days: number; league: string };

  journalRows: JournalRow[];
  journalStats: JournalStats | null;

  adminTab: string;
  adminDash: Record<string, any> | null;
  adminUsers: AdminUser[];
  adminSettings: RuntimeSetting[];
  adminUnlocked: boolean;

  notify: (text: string, tone?: Notice["tone"]) => void;
  clearNotice: () => void;
  bootSession: () => Promise<void>;
  setDay: (day: string) => void;
  loadDay: () => Promise<void>;
  openMatch: (gameId: number) => Promise<MatchDetail | null>;
  computeMatch: (gameId: number) => Promise<MatchDetail | null>;
  watchJob: (id: string) => Promise<void>;
  cancelJob: () => Promise<void>;
  loadHistory: () => Promise<void>;
  setHistoryFilter: (patch: Partial<State["historyFilters"]>) => void;
  loadJournal: () => Promise<void>;
  addBet: (payload: Record<string, unknown>) => Promise<boolean>;
  resolveBet: (id: number, status: string) => Promise<void>;
  loadAdmin: () => Promise<void>;
  unlockAdmin: (password: string) => Promise<boolean>;
};

let pollTimer: number | undefined;

export const useStore = create<State>((set, get) => ({
  boot: "loading",
  bootError: "",
  session: null,
  notice: null,

  day: "today",
  feed: [],
  collections: [],
  dayTotal: 0,
  withPick: 0,
  loadingFeed: false,
  feedError: null,

  detail: {},
  detailBusy: null,
  job: null,

  historyRows: [],
  historySummary: null,
  historyFilters: { verdict: "all", days: 0, league: "" },

  journalRows: [],
  journalStats: null,

  adminTab: "panel",
  adminDash: null,
  adminUsers: [],
  adminSettings: [],
  adminUnlocked: false,

  notify: (text, tone = "info") => set({ notice: { text, tone } }),
  clearNotice: () => set({ notice: null }),

  bootSession: async () => {
    set({ boot: "loading", bootError: "" });
    const initData = rawInitData();
    try {
      if (initData) {
        const session = await api.session(initData);
        if (session.token) saveToken(session.token);
        set({ session, boot: "ready", adminUnlocked: session.admin.unlocked });
        void get().loadDay();
        return;
      }
      if (savedToken()) {
        const session = await api.me();
        set({ session, boot: "ready", adminUnlocked: session.admin.unlocked });
        void get().loadDay();
        return;
      }
      set({ boot: "error", bootError: "Открой приложение из бота: кнопка «Приложение Raptor» в меню или команда /app." });
    } catch (exc) {
      set({ boot: "error", bootError: exc instanceof Error ? exc.message : "не удалось войти" });
    }
  },

  setDay: (day) => {
    set({ day });
    void get().loadDay();
  },

  loadDay: async () => {
    set({ loadingFeed: true, feedError: null });
    try {
      const [feed, packs] = await Promise.all([api.day(get().day), api.collections(get().day)]);
      set({
        feed: feed.items,
        collections: packs.collections,
        dayTotal: packs.total,
        withPick: packs.withPick,
        loadingFeed: false,
      });
    } catch (exc) {
      set({
        loadingFeed: false,
        feed: [],
        collections: [],
        feedError: exc instanceof RequestError ? exc.message : "источник не отвечает",
      });
    }
  },

  openMatch: async (gameId) => {
    const cached = get().detail[gameId];
    if (cached !== undefined) return cached;
    try {
      const response = await api.match(gameId);
      set((s) => ({ detail: { ...s.detail, [gameId]: response.data } }));
      return response.data;
    } catch (exc) {
      get().notify(exc instanceof Error ? exc.message : "разбор недоступен", "error");
      return null;
    }
  },

  computeMatch: async (gameId) => {
    set({ detailBusy: gameId });
    try {
      const { jobId } = await api.predict(gameId);
      await get().watchJob(jobId);
      const job = get().job;
      if (job?.status === "done" && job.result) {
        const detail = job.result as unknown as MatchDetail;
        set((s) => ({ detail: { ...s.detail, [gameId]: detail }, detailBusy: null }));
        void get().bootSession();
        return detail;
      }
      set({ detailBusy: null });
      if (job?.status === "error") get().notify(job.error || "расчёт не завершился", "error");
      return null;
    } catch (exc) {
      set({ detailBusy: null });
      get().notify(exc instanceof Error ? exc.message : "не удалось посчитать", "error");
      return null;
    }
  },

  watchJob: async (id) => {
    window.clearInterval(pollTimer);
    const tick = async () => {
      try {
        const job = await api.job(id);
        set({ job });
        if (job.status !== "running") window.clearInterval(pollTimer);
      } catch {
        window.clearInterval(pollTimer);
        set({ job: null });
      }
    };
    await tick();
    pollTimer = window.setInterval(tick, 900);
  },

  cancelJob: async () => {
    const job = get().job;
    if (!job) return;
    await api.cancelJob(job.id);
    window.clearInterval(pollTimer);
    set({ job: { ...job, status: "cancelled", stage: "остановлено" } });
  },

  loadHistory: async () => {
    try {
      const f = get().historyFilters;
      const response = await api.history({ verdict: f.verdict, days: f.days, league: f.league || undefined });
      set({ historyRows: response.rows, historySummary: response.summary });
    } catch (exc) {
      get().notify(exc instanceof Error ? exc.message : "история недоступна", "error");
    }
  },

  setHistoryFilter: (patch) => {
    set((s) => ({ historyFilters: { ...s.historyFilters, ...patch } }));
    void get().loadHistory();
  },

  loadJournal: async () => {
    try {
      const response = await api.journal();
      set({ journalRows: response.rows, journalStats: response.stats });
    } catch (exc) {
      get().notify(exc instanceof Error ? exc.message : "дневник недоступен", "error");
    }
  },

  addBet: async (payload) => {
    try {
      await api.journalAdd(payload);
      await get().loadJournal();
      get().notify("ставка записана", "ok");
      return true;
    } catch (exc) {
      get().notify(exc instanceof Error ? exc.message : "не записалось", "error");
      return false;
    }
  },

  resolveBet: async (id, status) => {
    try {
      await api.journalResolve(id, status);
      await get().loadJournal();
    } catch (exc) {
      get().notify(exc instanceof Error ? exc.message : "не удалось рассчитать", "error");
    }
  },

  loadAdmin: async () => {
    try {
      const [dash, users, settings] = await Promise.all([
        api.admin.dashboard(),
        api.admin.users(""),
        api.admin.settings(),
      ]);
      set({ adminDash: dash, adminUsers: users.items, adminSettings: settings.items, adminUnlocked: true });
    } catch (exc) {
      if (exc instanceof RequestError && exc.status === 401) {
        set({ adminUnlocked: false });
        get().notify("нужен пароль администратора", "info");
        return;
      }
      get().notify(exc instanceof Error ? exc.message : "нет данных", "error");
    }
  },

  unlockAdmin: async (password) => {
    try {
      const response = await api.admin.unlock(password);
      if (response.unlocked) {
        await get().loadAdmin();
        return true;
      }
      get().notify("пароль не подошёл", "error");
      return false;
    } catch (exc) {
      get().notify(exc instanceof Error ? exc.message : "не пустило", "error");
      return false;
    }
  },
}));
