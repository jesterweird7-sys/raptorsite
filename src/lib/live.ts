import { create } from "zustand";
import {
  api,
  RequestError,
  type LiveAdmin,
  type LiveBoard,
  type LiveFilters,
  type LiveGame,
  type LiveLog,
  type LiveScenario,
  type LiveSubscription,
} from "./api";

/** Транспорт табло: SSE, а если прокси или телефон урезали поток — поллинг.
 *  Оба пути пишут в одно состояние, поэтому экран не знает, откуда прилетели
 *  данные: у него всегда есть «возраст ленты» и он честно его показывает. */

export type StreamState = "off" | "live" | "poll";

type State = {
  board: LiveBoard | null;
  boardBusy: boolean;
  boardError: string;
  stream: StreamState;
  page: number;
  /** матча, у которых сигнал появился между двумя кадрами — их подсвечиваем; */
  fresh: number[];
  clock: number;

  gameId: number | null;
  detail: LiveGame | null;
  /** момент, когда карточку вытащили: серверный возраст дотачиваем ходиками клиента */
  detailAt: number;
  detailBusy: boolean;
  detailError: string;

  log: LiveLog | null;
  logBusy: boolean;
  filters: LiveFilters | null;
  subscription: LiveSubscription | null;
  scenarios: LiveScenario[];
  admin: LiveAdmin | null;
  adminBusy: boolean;
  error: string;

  start: (page?: number) => void;
  stop: () => void;
  refresh: () => Promise<void>;
  setPage: (page: number) => Promise<void>;
  openGame: (gameId: number) => Promise<void>;
  closeGame: () => void;
  refreshGame: () => Promise<void>;
  toggleWatch: (gameId: number, on: boolean) => Promise<void>;
  loadSettings: () => Promise<void>;
  saveFilters: (patch: Record<string, unknown>) => Promise<void>;
  saveSubscription: (patch: Record<string, unknown>) => Promise<void>;
  loadLog: () => Promise<void>;
  loadAdmin: () => Promise<void>;
};

let source: EventSource | null = null;
let poller: number | undefined;
let heartbeat: number | undefined;

function clearTransport() {
  source?.close();
  source = null;
  if (poller) window.clearInterval(poller);
  poller = undefined;
}

function startPolling(set: (partial: Partial<State>) => void, get: () => State) {
  if (poller) return;
  set({ stream: "poll" });
  const run = () => void get().refresh();
  run();
  poller = window.setInterval(run, 8000);
}

export const useLive = create<State>((set, get) => ({
  board: null,
  boardBusy: false,
  boardError: "",
  stream: "off",
  page: 0,
  fresh: [],
  clock: Date.now(),

  gameId: null,
  detail: null,
  detailAt: 0,
  detailBusy: false,
  detailError: "",

  log: null,
  logBusy: false,
  filters: null,
  subscription: null,
  scenarios: [],
  admin: null,
  adminBusy: false,
  error: "",

  start: (page) => {
    clearTransport();
    set({ stream: "live", page: page ?? get().page });
    void get().refresh();
    try {
      source = new EventSource(api.scanner.streamUrl(get().page));
      source.addEventListener("board", (event) => {
        const payload = JSON.parse(event.data as string) as LiveBoard;
        const arrived: number[] = [];
        for (const row of payload.rows) {
          if (row.signal && !row.signal.noBet && row.gameId) arrived.push(row.gameId);
        }
        const before = new Set(get().board?.rows.map((row) => row.gameId) ?? []);
        set({
          board: payload,
          boardError: "",
          page: payload.page,
          filters: payload.filters as LiveFilters,
          fresh: arrived.filter((id) => !before.has(id)),
          stream: "live",
        });
        window.setTimeout(() => set({ fresh: [] }), 2600);
      });
      source.onerror = () => startPolling(set, get);
    } catch {
      startPolling(set, get);
    }
    if (!heartbeat) {
      heartbeat = window.setInterval(() => set({ clock: Date.now() }), 1000);
    }
  },

  stop: () => {
    clearTransport();
    if (heartbeat) {
      window.clearInterval(heartbeat);
      heartbeat = undefined;
    }
    set({ stream: "off", fresh: [] });
  },

  refresh: async () => {
    set({ boardBusy: true });
    try {
      const board = await api.scanner.board(get().page);
      const arrived = board.rows
        .filter((row) => row.signal && !row.signal.noBet)
        .map((row) => row.gameId);
      const before = new Set(get().board?.rows.map((row) => row.gameId) ?? []);
      set({
        board,
        boardError: "",
        page: board.page,
        filters: board.filters as LiveFilters,
        fresh: arrived.filter((id) => !before.has(id)),
      });
      if (arrived.length) window.setTimeout(() => set({ fresh: [] }), 2600);
    } catch (error) {
      set({ boardError: error instanceof RequestError ? error.message : "лента не пришла" });
    } finally {
      set({ boardBusy: false });
    }
  },

  setPage: async (page) => {
    set({ page });
    /* старт сам перезапросит ленту и переподключит поток на новую страницу */
    if (source || poller) get().start(page);
    else await get().refresh();
  },

  openGame: async (gameId) => {
    set({ gameId, detail: null, detailBusy: true, detailError: "" });
    try {
      const data = await api.scanner.game(gameId);
      set({ detail: data, detailAt: Date.now(), gameId });
    } catch (error) {
      set({
        detailError: error instanceof RequestError ? error.message : "карточка не собралась",
        gameId,
      });
    } finally {
      set({ detailBusy: false });
    }
  },

  closeGame: () => set({ gameId: null, detail: null, detailError: "" }),

  refreshGame: async () => {
    const id = get().gameId;
    if (id !== null) await get().openGame(id);
  },

  toggleWatch: async (gameId, on) => {
    try {
      const result = await api.scanner.watch(gameId, on);
      const board = get().board;
      if (board) {
        set({
          board: {
            ...board,
            rows: board.rows.map((row) => (row.gameId === gameId ? { ...row, watched: result.watched } : row)),
          },
        });
      }
      const detail = get().detail;
      if (detail && detail.gameId === gameId) set({ detail: { ...detail, watched: result.watched } });
    } catch (error) {
      set({ error: error instanceof RequestError ? error.message : "не переключилось" });
    }
  },

  loadSettings: async () => {
    try {
      const [subscription, catalog] = await Promise.all([
        api.scanner.subscription(),
        api.scanner.scenarios(),
      ]);
      set({ subscription, scenarios: catalog.items });
    } catch (error) {
      set({ error: error instanceof RequestError ? error.message : "настройки не читаются" });
    }
  },

  saveFilters: async (patch) => {
    try {
      const filters = await api.scanner.setFilters(patch);
      set({ filters, error: "" });
      await get().refresh();
    } catch (error) {
      set({ error: error instanceof RequestError ? error.message : "фильтры не сохранились" });
    }
  },

  saveSubscription: async (patch) => {
    try {
      set({ subscription: await api.scanner.setSubscription(patch), error: "" });
    } catch (error) {
      set({ error: error instanceof RequestError ? error.message : "подписка не сохранилась" });
    }
  },

  loadLog: async () => {
    set({ logBusy: true });
    try {
      set({ log: await api.scanner.signals() });
    } catch (error) {
      set({ error: error instanceof RequestError ? error.message : "журнал не пришёл" });
    } finally {
      set({ logBusy: false });
    }
  },

  loadAdmin: async () => {
    set({ adminBusy: true });
    try {
      set({ admin: await api.scanner.admin() });
    } catch (error) {
      set({ error: error instanceof RequestError ? error.message : "админские данные нет" });
    } finally {
      set({ adminBusy: false });
    }
  },
}));

export function signalTone(signal: { priority?: string; noBet?: boolean } | null): "take" | "watch" | "skip" {
  if (!signal || signal.noBet) return "skip";
  return signal.priority === "high" ? "take" : "watch";
}

/** Сколько минут сигнала осталось, с честным дробным остатком по возрасту ленты. */
export function minutesLeft(minute: number, untilMinute: number, ageSeconds: number): number {
  const left = untilMinute - minute - ageSeconds / 60;
  return Math.max(0, Math.min(15, left));
}
