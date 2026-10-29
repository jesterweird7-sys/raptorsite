import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button, Chip, Panel, ProbBar, Sheet, Skeleton, type TabItem } from "../ui/kit";
import { Icon } from "../ui/icons";
import { EmptyState } from "../ui/Brand";
import { minutesLeft, signalTone, useLive } from "../lib/live";
import type { LiveRow, LiveSignal } from "../lib/api";
import { haptic } from "../lib/telegram";

export const LIVE_TAB: TabItem = { id: "live", label: "Лайв", icon: "pulse" };

const odds = (n: number | null | undefined) => (n ? n.toFixed(2).replace(".", ",") : "—");
const rate = (p: number) => `${Math.round(p * 100)}%`;
const edge = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1).replace(".", ",")}%`;
const ru = (n: number, digits = 1) => n.toFixed(digits).replace(".", ",");

/** Возраст ленты по-русски: «4 с назад», «2 мин назад», «3 ч назад». */
function ageText(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds >= 86400) return "нет данных";
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)} ч назад`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)} мин назад`;
  return `${Math.round(seconds)} с назад`;
}

/** Числа, которые меняются между кадрами, должны щёлкать — взгляд цепляет именно их. */
function Pop({ value, className, style }: { value: string; className?: string; style?: CSSProperties }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        className={className}
        style={style}
        initial={{ opacity: 0, y: -7, scale: 1.08 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 7 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

const PRIORITY_LABEL: Record<string, string> = {
  critical: "критичное",
  high: "высокое",
  medium: "среднее",
  low: "низкое",
  info: "инфо",
};

/* ── статус ленты ───────────────────────────────────────────────── */

function StatusStrip({ age, streaming }: { age: number; streaming: boolean }) {
  return (
    <div className="live-status panel panel--flat">
      <span className="live-dot" data-live={streaming ? "1" : "0"}>
        <i />
      </span>
      <span className="num" style={{ color: streaming ? "var(--mint-100)" : "var(--text-2)" }}>
        {streaming ? "поток" : "опрос"}
      </span>
      <span className="muted" style={{ marginLeft: "auto", fontSize: "var(--fs-xs)" }}>
        {ageText(age)}
      </span>
    </div>
  );
}

/* ── срок сигнала ───────────────────────────────────────────────── */

function Deadline({ signal, minute, age }: { signal: LiveSignal; minute: number; age: number }) {
  const left = minutesLeft(minute, signal.untilMinute, age);
  const span = Math.max(1, signal.validMinutes || 15);
  const ratio = Math.max(0, Math.min(1, left / span));
  const tone = left <= 0 ? "var(--miss)" : left <= 3 ? "var(--caution)" : "var(--sage-400)";
  return (
    <div className="deadline">
      <div className="deadline-head">
        <span className="label">актуален до {signal.untilMinute}'</span>
        <span className="num" style={{ color: tone }}>
          {left <= 0 ? "истёк" : `${ru(left, 1)}'`}
        </span>
      </div>
      <div className="deadline-track">
        <motion.div
          className="deadline-fill"
          initial={false}
          animate={{ width: `${ratio * 100}%`, backgroundColor: tone }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

/* ── сигнал ─────────────────────────────────────────────────────── */

function SignalCard({ signal, minute, age }: { signal: LiveSignal; minute: number; age: number }) {
  const tone = signalTone(signal);
  return (
    <div className="signal" data-tone={tone}>
      <div className="between">
        <span className="signal-bet num">
          {signal.market.startsWith("OVER:") ? `ТБ ${signal.market.slice(5).replace(".", ",")}` : signal.market}
          <b> @ {odds(signal.odds)}</b>
        </span>
        <span className={`verdict verdict--${tone}`}>{PRIORITY_LABEL[signal.priority] ?? signal.priority}</span>
      </div>
      <div className="signal-why">{signal.title || signal.reasons[0] || "совпадение сценария"}</div>
      {signal.noBet ? (
        <div className="signal-caveat">{signal.noBetReason || "ставки нет: цена вне коридора 1,40–3,00"}</div>
      ) : (
        <>
          <div className="between" style={{ fontSize: "var(--fs-xs)" }}>
            <span className="muted">модель {rate(signal.probability)} · перевес {edge(signal.evPct)}</span>
            {signal.confirmedBy.length ? <span className="muted">+{signal.confirmedBy.length} подтвержд.</span> : null}
          </div>
          <ProbBar value={signal.probability} cells={16} tone={signal.evPct <= 0 ? "risk" : "sage"} />
          <Deadline signal={signal} minute={minute} age={age} />
        </>
      )}
    </div>
  );
}

/* ── строка ленты ───────────────────────────────────────────────── */

function BoardRow({
  row,
  fresh,
  age,
  onOpen,
  onWatch,
  onHide,
}: {
  row: LiveRow;
  fresh: boolean;
  age: number;
  onOpen: () => void;
  onWatch: () => void;
  onHide: () => void;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`live-row${fresh ? " live-row--fresh" : ""}`}
      onClick={onOpen}
    >
      <div className="live-row-top">
        <span className="live-minute">
          <Pop value={String(row.minute)} className="num" />
          <i>'</i>
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="live-teams">
            <span>{row.home}</span>
            <Pop value={row.score || "—"} className="live-score num" />
            <span>{row.away}</span>
          </div>
          <div className="live-league">
            {row.league}
            {row.country ? ` · ${row.country}` : ""}
            {row.stats ? " · статистика есть" : " · без статистики"}
          </div>
        </div>
        <div className="row-actions">
          <button
            className="icon-btn"
            aria-label={row.watched ? "Не следить" : "Следить за матчем"}
            data-on={row.watched ? "1" : "0"}
            onClick={(e) => {
              e.stopPropagation();
              onWatch();
            }}
          >
            <Icon name="bell" size={16} />
          </button>
          <button
            className="icon-btn"
            aria-label="Скрыть матч"
            onClick={(e) => {
              e.stopPropagation();
              onHide();
            }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>

      <div className="live-metrics">
        <span title="Удары в створ">🎯 {row.sot || "—"}</span>
        <span title="XG">📈 {row.xg || "—"}</span>
        <span title="Угловые">🚩 {row.corners || "—"}</span>
        <span title="Индекс гола">
          ⚡ <Pop value={ru(row.gsi, 2)} className="num" />
        </span>
        <span className="data-state" title={row.dataNote}>
          {row.dataState}
        </span>
      </div>

      {row.signal ? (
        <SignalCard signal={row.signal} minute={row.minute} age={age} />
      ) : row.near.length ? (
        <div className="live-near">близко к запуску: {row.near.join(" · ")}</div>
      ) : (
        <div className="live-near">сценариев не совпало — ждём развития</div>
      )}
    </motion.li>
  );
}

/* ── табло ──────────────────────────────────────────────────────── */

function LiveBoard({ onOpen, onLog }: { onOpen: (id: number) => void; onLog: () => void }) {
  const board = useLive((s) => s.board);
  const fresh = useLive((s) => s.fresh);
  const busy = useLive((s) => s.boardBusy);
  const error = useLive((s) => s.boardError);
  const stream = useLive((s) => s.stream);
  const filters = useLive((s) => s.filters);
  const clock = useLive((s) => s.clock);
  const setPage = useLive((s) => s.setPage);
  const refresh = useLive((s) => s.refresh);
  const toggleWatch = useLive((s) => s.toggleWatch);
  const saveFilters = useLive((s) => s.saveFilters);
  const [sheet, setSheet] = useState(false);

  /* возраст ленты считается от часов клиента: лента моргает даже когда сервер молчит */
  const age = useMemo(() => {
    if (!board) return Number.POSITIVE_INFINITY;
    const base = board.updated ? new Date(board.updated).getTime() : 0;
    return base ? Math.max(0, (clock - base) / 1000) : board.ageSeconds;
  }, [board, clock]);

  const rows = board?.rows ?? [];
  const onlyStats = !!filters?.only_stats;
  const sort = String(filters?.sort ?? "stats");

  return (
    <div className="stack">
      <StatusStrip age={age} streaming={stream === "live"} />

      <div className="chipline">
        <Chip active={onlyStats} onClick={() => void saveFilters({ only_stats: !onlyStats })}>
          📊 со статистикой
        </Chip>
        <Chip onClick={() => void refresh()} aria-busy={busy}>
          <Icon name="refresh" size={15} /> обновить
        </Chip>
        <Chip onClick={() => setSheet(true)}>
          <Icon name="filter" size={15} /> настройки
        </Chip>
        <Chip onClick={onLog}>
          <Icon name="log" size={15} /> журнал
        </Chip>
      </div>

      {error ? (
        <Panel tone="flat" className="pad" style={{ color: "var(--miss)", fontSize: "var(--fs-s)" }}>
          {error}
        </Panel>
      ) : null}

      {!board && busy ? (
        <div className="stack">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} h={128} />
          ))}
        </div>
      ) : null}

      {board && rows.length === 0 ? (
        <EmptyState
          title="Под фильтры ничего не подходит"
          hint="В эфире нет матчей с такими условиями: ослабь диапазон минут или порог интереса в настройках."
        />
      ) : null}

      <motion.ul className="live-list" layout>
        <AnimatePresence mode="popLayout" initial={false}>
          {rows.map((row) => (
            <BoardRow
              key={row.gameId}
              row={row}
              fresh={fresh.includes(row.gameId)}
              age={age}
              onOpen={() => {
                haptic("impact", "medium");
                onOpen(row.gameId);
              }}
              onWatch={() => void toggleWatch(row.gameId, !row.watched)}
              onHide={() => {
                const hidden = [...((filters?.hidden as string[] | undefined) ?? []), String(row.gameId)];
                void saveFilters({ hidden });
              }}
            />
          ))}
        </AnimatePresence>
      </motion.ul>

      {board && board.pages > 1 ? (
        <div className="between" style={{ justifyContent: "center", gap: "var(--sp-3)" }}>
          <Button variant="ghost" onClick={() => void setPage(Math.max(0, board.page - 1))} disabled={board.page === 0}>
            <Icon name="back" size={16} />
          </Button>
          <span className="muted" style={{ fontSize: "var(--fs-s)" }}>
            страница {board.page + 1} из {board.pages} · всего {board.total}
          </span>
          <Button
            variant="ghost"
            onClick={() => void setPage(Math.min(board.pages - 1, board.page + 1))}
            disabled={board.page + 1 >= board.pages}
          >
            <Icon name="chev" size={16} />
          </Button>
        </div>
      ) : null}

      {board ? (
        <p className="muted" style={{ fontSize: "var(--fs-xs)", margin: 0 }}>
          сортировка: {SORT_LABEL[sort] ?? sort} · в эфире {board.live} · со статистикой {board.covered}
        </p>
      ) : null}

      <SettingsSheet open={sheet} onClose={() => setSheet(false)} />
    </div>
  );
}

/* ── карточка матча ─────────────────────────────────────────────── */

export function LiveMatch({
  gameId,
  onBack,
  backLabel = "к табло",
}: {
  gameId: number;
  onBack: () => void;
  backLabel?: string;
}) {
  const detail = useLive((s) => s.detail);
  const detailAt = useLive((s) => s.detailAt);
  const busy = useLive((s) => s.detailBusy);
  const error = useLive((s) => s.detailError);
  const board = useLive((s) => s.board);
  const clock = useLive((s) => s.clock);
  const refreshGame = useLive((s) => s.refreshGame);
  const toggleWatch = useLive((s) => s.toggleWatch);

  /* возраст снимка считает сервер, часы клиента только дотачивают его вперёд */
  const age = detail ? detail.ageSeconds + Math.max(0, (clock - detailAt) / 1000) : 0;

  const row = board?.rows.find((item) => item.gameId === gameId);
  const minute = Number(detail?.passport.minute ?? row?.minute ?? 0);

  return (
    <div className="stack">
      <div className="between">
        <Button variant="ghost" onClick={onBack}>
          <Icon name="back" size={16} /> {backLabel}
        </Button>
        <Button variant="ghost" onClick={() => void refreshGame()} disabled={busy}>
          <Icon name="refresh" size={16} /> обновить
        </Button>
      </div>

      {busy && !detail ? <Skeleton h={220} /> : null}
      {error && !detail ? (
        <Panel tone="flat" className="pad" style={{ color: "var(--miss)", fontSize: "var(--fs-s)" }}>
          {error}
        </Panel>
      ) : null}

      {detail ? (
        <>
          <Panel className="pad live-head">
            <div className="between" style={{ alignItems: "flex-start" }}>
              <div>
                <h2 style={{ fontSize: 18 }}>
                  {detail.passport.home} — {detail.passport.away}
                </h2>
                <div className="muted" style={{ fontSize: "var(--fs-s)" }}>
                  {detail.passport.league}
                  {detail.passport.country ? ` · ${detail.passport.country}` : ""}
                  {detail.passport.round ? ` · тур ${detail.passport.round}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <Pop value={String(detail.passport.score || "—")} className="num" style={{ fontSize: 26 }} />
                <div className="num" style={{ color: "var(--mint-200)", fontSize: 14 }}>
                  {minute}' <span className="muted">{detail.passport.period}</span>
                </div>
              </div>
            </div>
            <div className="between" style={{ marginTop: "var(--sp-3)" }}>
              <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
                {detail.quality.state} {detail.quality.note}
              </span>
              <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
                данных {ageText(age)}
              </span>
            </div>
            {detail.stale ? (
              <div className="signal-caveat" style={{ marginTop: "var(--sp-2)" }}>
                источник молчит — цифры могут отстать от поля
              </div>
            ) : null}
          </Panel>

          {detail.signal ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <SignalCard signal={detail.signal} minute={minute} age={age} />
              {detail.signal.reasons.length ? (
                <Panel tone="flat" className="pad" style={{ marginTop: "var(--sp-3)" }}>
                  <div className="label">почему именно этот сигнал</div>
                  <ul className="why">
                    {detail.signal.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </Panel>
              ) : null}
            </motion.div>
          ) : (
            <EmptyState title="Сигнала сейчас нет" hint="Ни один сценарий не совпал — сканер продолжает смотреть матч." />
          )}

          {detail.goalBasis && Object.keys(detail.goalBasis).length ? <GoalBasis basis={detail.goalBasis} /> : null}

          <Panel tone="flat" className="pad">
            <div className="label">поле</div>
            <div className="numbers">
              {[
                ["в створ", detail.numbers.sot],
                ["удары", detail.numbers.shots],
                ["угловые", detail.numbers.corners],
                ["xG", detail.numbers.xg],
                ["владение", detail.numbers.possession],
                ["давление", detail.numbers.pi],
              ].map(([label, value]) => (
                <div key={label} className="numbers-cell">
                  <span className="muted">{label}</span>
                  <b className="num">{value || "—"}</b>
                </div>
              ))}
            </div>
          </Panel>

          {detail.scenarios.length ? (
            <Panel tone="flat" className="pad">
              <div className="label">сценарии</div>
              <div className="stack-2" style={{ marginTop: "var(--sp-2)" }}>
                {detail.scenarios.map((item) => (
                  <div key={item.id} className="scenario">
                    <div className="between">
                      <span style={{ fontSize: "var(--fs-s)" }}>
                        {item.fired ? "✅ " : "▫️ "}
                        {item.title}
                      </span>
                      <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
                        {item.status}
                      </span>
                    </div>
                    <div className="deadline-track" style={{ height: 6 }}>
                      <motion.div
                        className="deadline-fill"
                        initial={false}
                        animate={{ width: `${Math.round(item.progress * 100)}%` }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                    {item.barriers.length ? (
                      <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
                        мешает: {item.barriers.join(" · ")}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}

          {detail.events.length ? (
            <Panel tone="flat" className="pad">
              <div className="label">события</div>
              <div className="events">
                {detail.events.map((item, index) => (
                  <motion.span
                    key={`${item.minute}-${item.kind}-${index}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.25 }}
                    className="event"
                    data-red={item.red ? "1" : "0"}
                  >
                    <b className="num">{item.minute}'</b> {item.kind}
                    {item.side ? ` · ${item.side}` : ""}
                    {item.player ? ` · ${item.player}` : ""}
                  </motion.span>
                ))}
              </div>
            </Panel>
          ) : null}

          <div className="grid2">
            <Button variant={detail.watched ? "kill" : "plain"} onClick={() => void toggleWatch(gameId, !detail.watched)}>
              <Icon name="bell" size={17} /> {detail.watched ? "не следить" : "следить"}
            </Button>
            <Button variant="ghost" onClick={onBack}>
              <Icon name="back" size={16} /> {backLabel}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** Из чего складывается вероятность «ещё одного гола» — без выдуманных чисел. */
function GoalBasis({ basis }: { basis: Record<string, any> }) {
  const rows: [string, string][] = [];
  const push = (key: string, label: string, digits = 2, suffix = "") => {
    const value = Number(basis[key]);
    if (Number.isFinite(value) && value !== 0) rows.push([label, `${ru(value, digits)}${suffix}`]);
  };
  push("per_minute", "гол в минуту");
  push("whole_match", "темп всего матча");
  push("current_half", "текущий тайм");
  push("league", "среднее лиги");
  push("score_factor", "коэффициент счёта", 2, "×");
  if (Array.isArray(basis.recent_windows)) {
    for (const window of basis.recent_windows) {
      const minutes = Number(window?.minutes ?? 0);
      const goals = Number(window?.goals ?? 0);
      if (minutes) rows.push([`последние ${minutes}'`, `${goals} гол`]);
    }
  }
  if (!rows.length) return null;
  return (
    <Panel tone="flat" className="pad">
      <div className="label">основа ставки на гол</div>
      <KeyValueRows rows={rows} />
    </Panel>
  );
}

function KeyValueRows({ rows }: { rows: [string, string][] }) {
  return (
    <div style={{ marginTop: "var(--sp-2)" }}>
      {rows.map(([key, value]) => (
        <div className="kv" key={key}>
          <span className="muted">{key}</span>
          <b>{value}</b>
        </div>
      ))}
    </div>
  );
}

/* ── журнал сигналов ────────────────────────────────────────────── */

function LiveLog({ onBack, onOpen }: { onBack: () => void; onOpen: (id: number) => void }) {
  const log = useLive((s) => s.log);
  const busy = useLive((s) => s.logBusy);
  const load = useLive((s) => s.loadLog);

  useEffect(() => {
    void load();
  }, [load]);

  const items = log?.items ?? [];
  return (
    <div className="stack">
      <div className="between">
        <Button variant="ghost" onClick={onBack}>
          <Icon name="back" size={16} /> к табло
        </Button>
        <Button variant="ghost" onClick={() => void load()} disabled={busy}>
          <Icon name="refresh" size={16} /> обновить
        </Button>
      </div>

      {log ? (
        <div className="grid2">
          <div className="panel panel--flat log-stat">
            <span className="label">за сутки</span>
            <b className="num">{log.summary.total}</b>
          </div>
          <div className="panel panel--flat log-stat">
            <span className="label">отправлено</span>
            <b className="num" style={{ color: "var(--mint-100)" }}>{log.summary.pushed}</b>
          </div>
          <div className="panel panel--flat log-stat">
            <span className="label">обработано</span>
            <b className="num">{log.summary.processed}</b>
          </div>
          <div className="panel panel--flat log-stat">
            <span className="label">разобрано</span>
            <b className="num">{log.summary.resolved}</b>
          </div>
          <div className="panel panel--flat log-stat">
            <span className="label">попаданий</span>
            <b className="num">{ru(log.summary.hitRate)}%</b>
          </div>
        </div>
      ) : null}

      {!log && busy ? <Skeleton h={200} /> : null}

      <ul className="log-list">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="log-row"
              data-pushed={item.pushed ? "1" : "0"}
              onClick={() => onOpen(item.gameId)}
            >
              <span className={`log-mark ${item.hit === true ? "hit" : item.hit === false ? "miss" : "wait"}`}>
                {item.hit === true ? "✓" : item.hit === false ? "✕" : "•"}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="log-title">
                  {item.home} — {item.away} <b className="num">{item.minute}'</b>
                </div>
                <div className="muted" style={{ fontSize: "var(--fs-xs)" }}>
                  {item.title} · {item.market} @ {odds(item.odds)} · модель {rate(item.probability)} ·{" "}
                  {edge(item.evPct)}
                </div>
                {item.fact ? (
                  <div className="muted" style={{ fontSize: "var(--fs-xs)" }}>
                    {item.fact}
                  </div>
                ) : null}
              </div>
              <span className="muted" style={{ fontSize: "var(--fs-xs)", whiteSpace: "nowrap" }}>
                {ageText(item.ageSeconds)}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {log && items.length ? (
        <p className="muted" style={{ fontSize: "var(--fs-xs)", margin: 0 }}>
          бледные строки — наблюдения, не ушедшие в push: цена вне коридора 1,40–3,00, отрицательный
          перевес или устаревшие данные.
        </p>
      ) : null}

      {log && !items.length ? <EmptyState title="За сутки сигналов не было" hint="Сканер смотрит эфир, но совпадений сценариев не нашёл." /> : null}
    </div>
  );
}

/* ── настройки ──────────────────────────────────────────────────── */

const WINDOWS: [number, number, string][] = [
  [0, 95, "любые"],
  [0, 30, "0–30'"],
  [30, 60, "30–60'"],
  [60, 95, "60–90'"],
];
const SORTS: [string, string][] = [
  ["stats", "со статистикой"],
  ["hotness", "по интересу"],
  ["minute", "по минуте"],
  ["signals", "по сигналам"],
];
const SORT_LABEL = Object.fromEntries(SORTS);
const HOT_LEVELS = [0, 0.2, 0.35, 0.5];
const PRIORITIES = ["critical", "high", "medium", "low", "info"];
const EVENTS: [string, string][] = [
  ["scenario", "новый сценарий"],
  ["goal", "гол"],
  ["red", "удаление"],
  ["finish", "финал"],
];
const GAPS = [60, 120, 300, 600];

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const filters = useLive((s) => s.filters);
  const subscription = useLive((s) => s.subscription);
  const scenarios = useLive((s) => s.scenarios);
  const loadSettings = useLive((s) => s.loadSettings);
  const saveFilters = useLive((s) => s.saveFilters);
  const saveSubscription = useLive((s) => s.saveSubscription);
  const error = useLive((s) => s.error);

  useEffect(() => {
    if (open && !subscription) void loadSettings();
  }, [open, subscription, loadSettings]);

  const hidden = ((filters?.hidden as string[] | undefined) ?? []).length;
  const hotness = Number(filters?.min_hotness ?? 0);
  const off = new Set(((subscription?.scenarios_off as string[] | undefined) ?? []) as string[]);
  const events = (subscription?.events ?? {}) as Record<string, boolean>;

  return (
    <Sheet open={open} onClose={onClose} title="Сканер">
      {error ? <div className="signal-caveat">{error}</div> : null}

      <div className="label">минуты матча</div>
      <div className="chipline" style={{ margin: "var(--sp-2) 0 var(--sp-4)" }}>
        {WINDOWS.map(([from, to, label]) => {
          const active = Number(filters?.minute_from ?? 0) === from && Number(filters?.minute_to ?? 95) === to;
          return (
            <Chip
              key={label}
              active={active}
              onClick={() => void saveFilters({ minute_from: from, minute_to: to })}
            >
              {label}
            </Chip>
          );
        })}
      </div>

      <div className="label">сортировка</div>
      <div className="chipline" style={{ margin: "var(--sp-2) 0 var(--sp-4)" }}>
        {SORTS.map(([code, label]) => (
          <Chip key={code} active={String(filters?.sort ?? "stats") === code} onClick={() => void saveFilters({ sort: code })}>
            {label}
          </Chip>
        ))}
      </div>

      <div className="label">порог интереса</div>
      <div className="chipline" style={{ margin: "var(--sp-2) 0 var(--sp-4)" }}>
        {HOT_LEVELS.map((level) => (
          <Chip key={level} active={Math.abs(hotness - level) < 0.001} onClick={() => void saveFilters({ min_hotness: level })}>
            ≥ {ru(level, 2)}
          </Chip>
        ))}
      </div>

      <div className="between" style={{ marginBottom: "var(--sp-4)" }}>
        <span className="muted" style={{ fontSize: "var(--fs-s)" }}>скрыто матчей: {hidden}</span>
        <Button variant="ghost" onClick={() => void saveFilters({ hidden: [] })} disabled={!hidden}>
          вернуть все
        </Button>
      </div>

      <div className="between">
        <span className="label">уведомления</span>
        <Chip
          active={!!subscription?.enabled}
          onClick={() => void saveSubscription({ enabled: !subscription?.enabled })}
        >
          {subscription?.enabled ? "включены" : "выключены"}
        </Chip>
      </div>
      <div className="chipline" style={{ margin: "var(--sp-2) 0 var(--sp-4)" }}>
        <Chip
          active={!!subscription?.by_filters}
          onClick={() => void saveSubscription({ byFilters: !subscription?.by_filters })}
        >
          по моим фильтрам
        </Chip>
        {GAPS.map((gap) => (
          <Chip
            key={gap}
            active={Number(subscription?.min_gap_sec ?? 120) === gap}
            onClick={() => void saveSubscription({ minGapSec: gap })}
          >
            раз в {gap} с
          </Chip>
        ))}
      </div>

      <div className="label">важность</div>
      <div className="chipline" style={{ margin: "var(--sp-2) 0 var(--sp-4)" }}>
        {PRIORITIES.map((code) => (
          <Chip
            key={code}
            active={String(subscription?.min_priority ?? "high") === code}
            onClick={() => void saveSubscription({ minPriority: code })}
          >
            {PRIORITY_LABEL[code]}
          </Chip>
        ))}
      </div>

      <div className="label">повод написать</div>
      <div className="chipline" style={{ margin: "var(--sp-2) 0 var(--sp-4)" }}>
        {EVENTS.map(([code, label]) => (
          <Chip
            key={code}
            active={events[code] !== false}
            onClick={() => void saveSubscription({ event: `${code}=${events[code] !== false ? 0 : 1}` })}
          >
            {label}
          </Chip>
        ))}
      </div>

      {scenarios.length ? (
        <>
          <div className="label">сценарии в push</div>
          <div className="chipline" style={{ margin: "var(--sp-2) 0 var(--sp-4)" }}>
            {scenarios.map((item) => (
              <Chip
                key={item.id}
                active={!off.has(item.id)}
                onClick={() => void saveSubscription({ scenario: item.id })}
                title={`${PRIORITY_LABEL[item.priority] ?? item.priority} · до ${item.validMinutes}'`}
              >
                {item.title}
              </Chip>
            ))}
          </div>
        </>
      ) : null}

      <Button full onClick={onClose} variant="kill">
        готово
      </Button>
    </Sheet>
  );
}

/* ── раздел целиком ─────────────────────────────────────────────── */

export function LiveSection() {
  const [page, setPage] = useState<"board" | "match" | "log">("board");
  const gameId = useLive((s) => s.gameId);
  const start = useLive((s) => s.start);
  const stop = useLive((s) => s.stop);
  const openGame = useLive((s) => s.openGame);
  const closeGame = useLive((s) => s.closeGame);

  useEffect(() => {
    start();
    return () => stop();
  }, [start, stop]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={page + (gameId ?? "")}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        {page === "match" && gameId !== null ? (
          <LiveMatch
            gameId={gameId}
            onBack={() => {
              closeGame();
              setPage("board");
            }}
          />
        ) : page === "log" ? (
          <LiveLog
            onBack={() => setPage("board")}
            onOpen={(id) => {
              void openGame(id);
              setPage("match");
            }}
          />
        ) : (
          <LiveBoard
            onOpen={(id) => {
              void openGame(id);
              setPage("match");
            }}
            onLog={() => setPage("log")}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/* ── админ: состояние сканера и калибровка ──────────────────────── */

export function AdminScanner() {
  const admin = useLive((s) => s.admin);
  const busy = useLive((s) => s.adminBusy);
  const load = useLive((s) => s.loadAdmin);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="stack">
      <div className="between">
        <h2>Лайв-сканер</h2>
        <Button variant="ghost" onClick={() => void load()} disabled={busy}>
          <Icon name="refresh" size={16} />
        </Button>
      </div>

      {!admin && busy ? <Skeleton h={180} /> : null}

      {admin ? (
        <>
          <div className="grid2">
            <div className="panel panel--flat log-stat">
              <span className="label">цикл</span>
              <b className="num" style={{ color: admin.state.enabled ? "var(--take)" : "var(--miss)" }}>
                {admin.state.enabled ? "работает" : "выключен"}
              </b>
            </div>
            <div className="panel panel--flat log-stat">
              <span className="label">тик</span>
              <b className="num">{admin.state.intervalSec} с</b>
            </div>
            <div className="panel panel--flat log-stat">
              <span className="label">лента обновлена</span>
              <b className="num">{ageText(Number(admin.state.boardAge ?? 0))}</b>
            </div>
            <div className="panel panel--flat log-stat">
              <span className="label">в эфире</span>
              <b className="num">
                {admin.state.boardCovered}/{admin.state.boardLive}
              </b>
            </div>
          </div>

          <Panel tone="flat" className="pad">
            <div className="label">сигналы за сутки</div>
            <KeyValueRows
              rows={[
                ["всего", String(admin.state.signals24h ?? 0)],
                ["обработано", String(admin.state.delivered24h ?? 0)],
                ["разобрано", String(admin.state.resolved24h ?? 0)],
                ["лимит push в час", String(admin.state.alertsPerHour ?? 0)],
                ["матчей за тик", String(admin.state.maxGames ?? 0)],
              ]}
            />
          </Panel>

          <Panel tone="flat" className="pad">
            <div className="label">калибровка модели</div>
            <KeyValueRows
              rows={[
                ["Brier", admin.calibration.brier !== undefined ? ru(Number(admin.calibration.brier), 4) : "—"],
                ["log loss", admin.calibration.logLoss !== undefined ? ru(Number(admin.calibration.logLoss), 4) : "—"],
                ["разбор", admin.calibration.n !== undefined ? String(admin.calibration.n) : "—"],
                ["покрытие", admin.calibration.coverage !== undefined ? rate(Number(admin.calibration.coverage)) : "—"],
              ]}
            />
            {Array.isArray(admin.calibration.buckets) && admin.calibration.buckets.length ? (
              <div className="stack-2" style={{ marginTop: "var(--sp-3)" }}>
                <span className="label">корзины: заявлено → зашло</span>
                {admin.calibration.buckets.map((item: Record<string, any>) => (
                  <div className="kv" key={`${item.from}-${item.to}`}>
                    <span className="muted">
                      {rate(Number(item.from))}–{rate(Number(item.to))} · n={item.n}
                    </span>
                    <b style={{ color: Math.abs(Number(item.gap)) > 0.08 ? "var(--caution)" : "var(--text-1)" }}>
                      {rate(Number(item.predicted))} → {rate(Number(item.observed))}
                    </b>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ fontSize: "var(--fs-xs)" }}>
                данных для корзин пока мало — калибровка копит их в фоне.
              </p>
            )}
          </Panel>
        </>
      ) : null}
    </div>
  );
}
