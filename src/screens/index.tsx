import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Chip,
  KeyValue,
  LiquidProgress,
  Panel,
  ProbBar,
  Ring,
  Sheet,
  Skeleton,
  Verdict,
  normalizeVerdict,
  type TabItem,
  type VerdictKind,
} from "../ui/kit";
import { Icon } from "../ui/icons";
import { EmptyState } from "../ui/Brand";
import { useStore } from "../lib/store";
import type { Collection, MatchDetail, MatchItem, Pick } from "../lib/api";
import { haptic, openLink } from "../lib/telegram";
import { AdminScanner, LIVE_TAB } from "./live";

const DAYS: [string, string][] = [
  ["today", "Сегодня"],
  ["tomorrow", "Завтра"],
  ["yesterday", "Вчера"],
];

const odds = (n: number | null | undefined) => (n ? n.toFixed(2).replace(".", ",") : "—");
const pct = (n: number | null | undefined, digits = 1) =>
  n === null || n === undefined ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(digits).replace(".", ",")}%`;
const ru = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined ? "—" : n.toFixed(digits).replace(".", ",");

function verdictOf(pick: Pick | null): VerdictKind {
  return pick ? normalizeVerdict(pick.verdict) : "watch";
}

function Head({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ display: "grid", gap: 2, paddingTop: "var(--sp-2)" }}>
      <h1>{title}</h1>
      {sub ? <span className="muted" style={{ fontSize: "var(--fs-s)" }}>{sub}</span> : null}
    </div>
  );
}

export function Notice() {
  const notice = useStore((s) => s.notice);
  const clear = useStore((s) => s.clearNotice);
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(clear, 4200);
    return () => window.clearTimeout(id);
  }, [notice, clear]);
  if (!notice) return null;
  const color = notice.tone === "error" ? "var(--miss)" : notice.tone === "ok" ? "var(--take)" : "var(--text-2)";
  return (
    <div
      role="status"
      className="panel panel--flat"
      style={{ padding: "10px 14px", color, fontSize: "var(--fs-s)" }}
      onClick={clear}
    >
      {notice.text}
    </div>
  );
}

/* ── ОХОТА: главное меню из подборок на актуальные матчи ───────── */

export function Hunt({ onOpen, go }: { onOpen: (id: number) => void; go: (tab: string) => void }) {
  const { session, day, setDay, collections, feed, dayTotal, withPick, loadingFeed, feedError, loadDay } = useStore();
  const quota = session?.quota;
  const nearest = useMemo(
    () => [...feed].sort((a, b) => a.dateIso.localeCompare(b.dateIso)).slice(0, 6),
    [feed],
  );

  return (
    <>
      <Head
        title="Охота"
        sub={
          feedError
            ? "источник молчит — данные подтянутся, как только ответит DataFeed"
            : `${dayTotal} матчей в работе · сигналов: ${withPick}`
        }
      />

      <div className="row wrap">
        {DAYS.map(([id, label]) => (
          <Chip key={id} active={day === id} onClick={() => setDay(id)}>
            {label}
          </Chip>
        ))}
      </div>

      {loadingFeed ? (
        <>
          <Skeleton h={168} />
          <Skeleton h={112} />
        </>
      ) : feedError ? (
        <>
          <EmptyState title="Источники не отвечают" hint={feedError} />
          <Button icon="refresh" full onClick={() => void loadDay()}>
            Повторить запрос
          </Button>
        </>
      ) : (
        collections.map((c) => <Pack key={c.id} pack={c} onOpen={onOpen} />)
      )}

      {!loadingFeed && !feedError && withPick === 0 ? (
        <section style={{ display: "grid", gap: "var(--sp-2)" }}>
          <div className="between">
            <span className="label">ближайшие матчи</span>
            <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
              сигналов: {withPick}
            </span>
          </div>
          <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
            Прогрев модели идёт в фоновом процессе бота. Открой матч — посчитаем разбор по месту.
          </span>
          <div style={{ display: "grid", gap: "var(--sp-2)" }}>
            {nearest.map((m) => (
              <MatchCard key={m.gameId} m={m} onOpen={onOpen} compact />
            ))}
          </div>
        </section>
      ) : null}

      <Panel tone="flat" className="pad stack-2">
        <span className="label">быстрые действия</span>
        <div className="grid2">
          <Button icon="pitch" onClick={() => go("feed")}>
            Все матчи
          </Button>
          <Button icon="ledger" onClick={() => go("journal")}>
            История и дневник
          </Button>
          <Button icon="wallet" onClick={() => go("cabinet")}>
            Подписка
          </Button>
          <Button icon="coin" onClick={() => go("cabinet")}>
            Лимит: {quota ? `${quota.freeLeft + quota.bonus}` : "…"}
          </Button>
        </div>
      </Panel>
    </>
  );
}

function Pack({ pack, onOpen }: { pack: Collection; onOpen: (id: number) => void }) {
  if (!pack.count) return null;
  return (
    <section style={{ display: "grid", gap: "var(--sp-2)" }}>
      <div className="between">
        <span className="label">{pack.title}</span>
        <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
          {pack.count}
        </span>
      </div>
      <div style={{ display: "grid", gap: "var(--sp-2)" }}>
        {pack.items.map((m) => (
          <MatchCard key={m.gameId} m={m} onOpen={onOpen} compact />
        ))}
      </div>
      <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
        {pack.hint}
      </span>
    </section>
  );
}

function MatchCard({ m, onOpen, compact }: { m: MatchItem; onOpen: (id: number) => void; compact?: boolean }) {
  const v = verdictOf(m.pick);
  return (
    <button className="card" data-verdict={v} onClick={() => onOpen(m.gameId)} style={{ padding: compact ? "var(--sp-3) var(--sp-4)" : undefined }}>
      <div className="between">
        <span style={{ display: "grid", gap: 1, minWidth: 0 }}>
          <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
            {m.league || m.country} · {m.time}
          </span>
          <span style={{ fontSize: 15.5 }}>
            {m.home} — {m.away}
          </span>
        </span>
        <span className="row" style={{ gap: 8 }}>
          <span className="dot" data-verdict={v} />
          <span className="num" style={{ fontSize: 15 }}>
            {odds(m.pick?.odds)}
          </span>
        </span>
      </div>
      {m.pick ? (
        <div className="between" style={{ fontSize: "var(--fs-s)" }}>
          <span style={{ color: "var(--text-2)" }}>{m.pick.market}</span>
          <span className="row" style={{ gap: "var(--sp-3)" }}>
            <span className="muted">{ru(m.pick.probability * 100)}%</span>
            <span className="num" style={{ color: m.pick.evPct > 0 ? "var(--take)" : "var(--miss)" }}>
              {pct(m.pick.evPct)}
            </span>
          </span>
        </div>
      ) : (
        <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
          разбор ещё не считан — открой, чтобы посчитать
        </span>
      )}
    </button>
  );
}

/* ── МАТЧИ ─────────────────────────────────────────────────────── */

export function Feed({ onOpen }: { onOpen: (id: number) => void }) {
  const { day, setDay, feed, loadingFeed, feedError, loadDay } = useStore();
  const [q, setQ] = useState("");
  const [onlyPick, setOnlyPick] = useState(false);

  const list = useMemo(
    () =>
      feed
        .filter((m) => (onlyPick ? !!m.pick : true))
        .filter((m) =>
          q.trim() ? `${m.home} ${m.away} ${m.league}`.toLowerCase().includes(q.trim().toLowerCase()) : true,
        ),
    [feed, onlyPick, q],
  );
  const leagues = useMemo(() => Array.from(new Set(feed.map((m) => m.league).filter(Boolean))).slice(0, 12), [feed]);
  const [league, setLeague] = useState("");

  const shown = league ? list.filter((m) => m.league === league) : list;

  return (
    <>
      <Head title="Матчи" sub="линия дня и всё, что уже посчитано" />

      <label className="panel panel--flat row" style={{ padding: "10px 14px", gap: 10 }}>
        <Icon name="search" size={18} style={{ color: "var(--text-3)" }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Команда или лига"
          aria-label="Поиск матча"
          style={{ flex: 1, border: 0, background: "none", outline: "none", fontSize: 15 }}
        />
        {q ? (
          <button className="btn btn--ghost" style={{ minHeight: 28, padding: "0 10px" }} onClick={() => setQ("")} aria-label="Очистить">
            <Icon name="close" size={14} />
          </button>
        ) : null}
      </label>

      <div className="row wrap">
        {DAYS.slice(0, 2).map(([id, label]) => (
          <Chip key={id} active={day === id} onClick={() => setDay(id)}>
            {label}
          </Chip>
        ))}
        <Chip active={onlyPick} onClick={() => setOnlyPick(!onlyPick)}>
          Только с сигналом
        </Chip>
      </div>

      {leagues.length > 1 ? (
        <div className="row wrap" style={{ gap: 6 }}>
          <Chip active={!league} onClick={() => setLeague("")}>
            Все лиги
          </Chip>
          {leagues.map((l) => (
            <Chip key={l} active={league === l} onClick={() => setLeague(league === l ? "" : l)}>
              {l}
            </Chip>
          ))}
        </div>
      ) : null}

      {loadingFeed ? (
        <Panel>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="pad" style={{ paddingBottom: 10 }}>
              <Skeleton h={34} />
            </div>
          ))}
        </Panel>
      ) : feedError ? (
        <EmptyState title="Нет данных" hint={feedError} />
      ) : shown.length ? (
        <div style={{ display: "grid", gap: "var(--sp-2)" }}>
          {shown.map((m) => (
            <MatchCard key={m.gameId} m={m} onOpen={onOpen} compact />
          ))}
        </div>
      ) : (
        <EmptyState title="Пусто" hint="Под этот фильтр матчей нет. Сними фильтры или пересчитай день." />
      )}

      <Button icon="refresh" full variant="ghost" onClick={() => void loadDay()}>
        Обновить линию
      </Button>
    </>
  );
}

/* ── РАЗБОР МАТЧА ──────────────────────────────────────────────── */

export function MatchScreen({ gameId, onBack }: { gameId: number; onBack: () => void }) {
  const { detail, openMatch, computeMatch, detailBusy, job, cancelJob, session } = useStore();
  const [m, setM] = useState<MatchDetail | null | undefined>(detail[gameId]);
  const busy = detailBusy === gameId;

  useEffect(() => {
    void openMatch(gameId);
  }, [gameId, openMatch]);

  useEffect(() => {
    setM(detail[gameId]);
  }, [detail, gameId]);

  const pick = m?.pick ?? null;
  const v = verdictOf(pick);

  return (
    <>
      <div className="between">
        <Button variant="ghost" icon="back" onClick={onBack}>
          Назад
        </Button>
        <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
          матч №{gameId}
        </span>
      </div>

      {!m ? (
        <div className="stack">
          <Skeleton h={54} />
          <Skeleton h={150} />
          <Skeleton h={190} />
          {busy || job?.status === "running" ? (
            <Panel tone="flat" className="pad stack-2">
              <LiquidProgress pct={job?.pct ?? 5} stage={job?.stage || "считаем моделью"} />
              <Button variant="danger" icon="stop" onClick={() => void cancelJob()}>
                Отменить расчёт
              </Button>
            </Panel>
          ) : (
            <Panel tone="flat" className="pad stack-2">
              <span className="muted" style={{ fontSize: "var(--fs-s)" }}>
                Этот матч ещё не был в прогреве. Расчёт занимает 10–40 секунд и списывает один прогноз из лимита.
              </span>
              <Button
                variant="kill"
                icon="hunt"
                full
                disabled={session?.quota ? !session.quota.unlimited && session.quota.freeLeft + session.quota.bonus <= 0 : false}
                onClick={() => {
                  haptic("impact", "medium");
                  void computeMatch(gameId);
                }}
              >
                Посчитать разбор
              </Button>
            </Panel>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gap: 2 }}>
            <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
              {m.league || m.country} · {m.time} {m.isLive ? "· идёт" : m.isFinished ? "· завершён" : ""}
            </span>
            <h1 style={{ fontSize: 24 }}>
              {m.home} — {m.away}
            </h1>
            {m.isFinished && m.scoreHome !== null ? (
              <span className="num" style={{ color: "var(--text-2)" }}>
                {m.scoreHome}:{m.scoreAway}
              </span>
            ) : null}
          </div>

          {pick ? (
            <Panel tone="strong" className="pad stack">
              <div className="between">
                <span className="label">главная ставка</span>
                <Verdict kind={v} />
              </div>
              <div className="between" style={{ alignItems: "end" }}>
                <div>
                  <div style={{ fontSize: 15 }}>{pick.market}</div>
                  <div className="num" style={{ fontSize: 30, color: "var(--mint-100)" }}>
                    {odds(pick.odds)}
                  </div>
                </div>
                <Ring value={pick.strength} label={ru(pick.strength * 100)} tone="mint" size={62} />
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                <div className="between" style={{ fontSize: "var(--fs-xs)" }}>
                  <span className="muted">проходимость</span>
                  <span className="num">{ru(pick.probability * 100)}%</span>
                </div>
                <ProbBar value={pick.probability} tone={v === "take" ? "sage" : "risk"} />
              </div>
              <KeyValue
                rows={[
                  ["Справедливый коэффициент", odds(pick.fairOdds)],
                  ["Валуй", pct(pick.evPct), pick.evPct > 0 ? "var(--take)" : "var(--miss)"],
                  ["Доля кассы", `${ru(pick.kellyUnits, 1)} у.`],
                  ["Сила сигнала", `${ru(pick.strength * 100)} из 100`],
                ]}
              />
              {pick.reason ? (
                <div
                  style={{
                    borderLeft: "2px solid var(--hairline-hi)",
                    paddingLeft: "var(--sp-3)",
                    fontSize: "var(--fs-s)",
                    color: "var(--text-2)",
                  }}
                >
                  {pick.reason}
                </div>
              ) : null}
            </Panel>
          ) : (
            <Panel tone="flat" className="pad">
              <span className="label">перевеса нет</span>
              <div className="muted" style={{ marginTop: 4, fontSize: "var(--fs-s)" }}>
                Модель не нашла рынка, где вероятность бьёт линию. Такой матч показываем без ставки.
              </div>
            </Panel>
          )}

          {m.groups.map((group) => (
            <Panel key={group.id} className="pad stack-2">
              <span className="label">{group.title}</span>
              {group.markets.map((row) => (
                <div key={row.key} style={{ display: "grid", gap: 4 }}>
                  <div className="between" style={{ fontSize: "var(--fs-s)" }}>
                    <span className="muted">{row.label}</span>
                    <span className="row" style={{ gap: "var(--sp-3)" }}>
                      <span className="num">{ru(row.probability * 100)}%</span>
                      <span className="num" style={{ color: "var(--text-2)", minWidth: 42, textAlign: "right" }}>
                        {odds(row.odds)}
                      </span>
                    </span>
                  </div>
                  <ProbBar value={row.probability} cells={16} tone={row.evPct !== null && row.evPct < 0 ? "risk" : "sage"} />
                </div>
              ))}
            </Panel>
          ))}

          {m.topScores.length ? (
            <Panel className="pad stack-2">
              <span className="label">точный счёт</span>
              <div className="row wrap" style={{ gap: "var(--sp-2)" }}>
                {m.topScores.map((s) => (
                  <span key={`${s.home}-${s.away}`} className="chip">
                    <span className="num">
                      {s.home}:{s.away}
                    </span>
                    <span className="muted" style={{ fontSize: 11 }}>
                      {ru(s.probability * 100)}%
                    </span>
                  </span>
                ))}
              </div>
            </Panel>
          ) : null}

          {m.ai?.text ? (
            <Panel tone="flat" className="pad stack-2">
              <span className="label">разбор нейросети</span>
              <div style={{ fontSize: "var(--fs-s)", color: "var(--text-2)", whiteSpace: "pre-wrap" }}>{m.ai.text}</div>
            </Panel>
          ) : null}

          <Button icon="refresh" full variant="ghost" disabled={busy} onClick={() => void computeMatch(gameId)}>
            Пересчитать
          </Button>
        </>
      )}
    </>
  );
}

/* ── ДНЕВНИК: ставки + история прогнозов ───────────────────────── */

export function Journal() {
  const { journalRows, journalStats, loadJournal, resolveBet, historyRows, historySummary, historyFilters, setHistoryFilter, loadHistory } =
    useStore();
  const [tab, setTab] = useState<"bets" | "history">("bets");
  const [add, setAdd] = useState(false);

  useEffect(() => {
    void loadJournal();
    void loadHistory();
  }, [loadJournal, loadHistory]);

  const s = journalStats;

  return (
    <>
      <Head title="Дневник" sub="свои ставки и все прогнозы, которые ты открывал" />

      <div className="row wrap">
        <Chip active={tab === "bets"} onClick={() => setTab("bets")}>
          Ставки
        </Chip>
        <Chip active={tab === "history"} onClick={() => setTab("history")}>
          История прогнозов
        </Chip>
      </div>

      {tab === "bets" ? (
        <>
          <div className="grid2">
            <Tile label="ставок" value={ru(s?.total)} hint={`${s?.pending ?? 0} в игре`} />
            <Tile label="проходимость" value={`${ru(s?.hitRate)}%`} hint={`${s?.won ?? 0} зашли`} />
            <Tile label="результат" value={`${(s?.profit ?? 0) > 0 ? "+" : ""}${ru(s?.profit, 1)} у.`} tone={(s?.profit ?? 0) >= 0 ? "take" : "miss"} />
            <Tile label="средний кф" value={ru(s?.avgOdds, 2)} hint={`доходность ${ru(s?.roi, 1)}%`} />
          </div>

          <Panel>
            {journalRows.length ? (
              journalRows.map((b) => (
                <div className="rowline rowline--text" key={b.id} style={{ gridTemplateColumns: "1fr auto auto" }}>
                  <span style={{ display: "grid", gap: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14 }}>{b.match}</span>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                      {b.date} · {b.market} · кф {odds(b.odds)} · {ru(b.stake, 1)} у.
                    </span>
                  </span>
                  <span
                    className="num"
                    style={{
                      fontSize: 13,
                      color: b.status === "won" ? "var(--take)" : b.status === "lost" ? "var(--miss)" : "var(--text-3)",
                    }}
                  >
                    {b.status === "won" ? "зашло" : b.status === "lost" ? "минус" : `${ru(b.profit, 1)} у.`}
                  </span>
                  {b.status === "pending" ? (
                    <span className="row" style={{ gap: 4 }}>
                      <button className="btn btn--ghost" onClick={() => void resolveBet(b.id, "won")}>
                        зачёт
                      </button>
                      <button className="btn btn--ghost" onClick={() => void resolveBet(b.id, "lost")}>
                        промах
                      </button>
                    </span>
                  ) : (
                    <span />
                  )}
                </div>
              ))
            ) : (
              <div className="pad">
                <span className="muted">Ставок пока нет. Запиши первую — дневник начнёт считать проходимость.</span>
              </div>
            )}
          </Panel>

          <Button variant="kill" icon="plus" full onClick={() => setAdd(true)}>
            Добавить ставку
          </Button>
          <AddBet open={add} onClose={() => setAdd(false)} />
        </>
      ) : (
        <>
          <div className="row wrap">
            {["all", "брать", "малая", "осторожно"].map((k) => (
              <Chip key={k} active={historyFilters.verdict === k} onClick={() => setHistoryFilter({ verdict: k })}>
                {k === "all" ? "Все вердикты" : k[0].toUpperCase() + k.slice(1)}
              </Chip>
            ))}
          </div>
          <div className="row wrap">
            {[
              [0, "За всё время"],
              [7, "7 дней"],
              [30, "30 дней"],
              [90, "90 дней"],
            ].map(([d, label]) => (
              <Chip key={d} active={historyFilters.days === d} onClick={() => setHistoryFilter({ days: Number(d) })}>
                {label}
              </Chip>
            ))}
          </div>

          {historySummary ? (
            <div className="grid2">
              <Tile label="прогнозов" value={ru(historySummary.total)} hint={`${historySummary.settled} с исходом`} />
              <Tile label="точность" value={`${ru(historySummary.hitRate)}%`} hint={`ROI ${ru(historySummary.roi, 1)}%`} />
            </div>
          ) : null}

          <Panel>
            {historyRows.length ? (
              historyRows.slice(0, 40).map((r, i) => (
                <div className="rowline rowline--text" key={`${r.gameId}-${i}`} style={{ gridTemplateColumns: "1fr auto" }}>
                  <span style={{ display: "grid", gap: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14 }}>{r.match}</span>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>
                      {r.date} · {r.market} · кф {odds(r.odds)}
                    </span>
                  </span>
                  <span
                    className="num"
                    style={{ fontSize: 12, color: r.hit ? "var(--take)" : r.hit === false ? "var(--miss)" : "var(--text-3)" }}
                  >
                    {r.hit ? "попал" : r.hit === false ? "мимо" : "ждём"}
                  </span>
                </div>
              ))
            ) : (
              <div className="pad">
                <span className="muted">Открытых прогнозов на этот срез нет.</span>
              </div>
            )}
          </Panel>
        </>
      )}
    </>
  );
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "take" | "miss" }) {
  return (
    <div className="panel panel--flat" style={{ padding: "12px 14px", display: "grid", gap: 2 }}>
      <span className="label">{label}</span>
      <span className="num" style={{ fontSize: 20, color: tone ? `var(--${tone})` : undefined }}>
        {value}
      </span>
      {hint ? <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>{hint}</span> : null}
    </div>
  );
}

function AddBet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addBet = useStore((s) => s.addBet);
  const [form, setForm] = useState({ match: "", market: "", odds: "1.80", stake: "1.0" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <Sheet open={open} onClose={onClose} title="Новая ставка">
      <div className="stack-2">
        <Field label="матч" value={form.match} onChange={set("match")} placeholder="Зенит — Краснодар" />
        <Field label="рынок" value={form.market} onChange={set("market")} placeholder="П1 / ТМ 2.5 / обе забьют" />
        <div className="grid2">
          <Field label="коэффициент" value={form.odds} onChange={set("odds")} numeric />
          <Field label="сумма, у." value={form.stake} onChange={set("stake")} numeric />
        </div>
        <Button
          variant="kill"
          full
          icon="check"
          onClick={async () => {
            const ok = await addBet({
              match: form.match,
              market: form.market || "—",
              pick: form.market || "—",
              odds: Number(form.odds.replace(",", ".")) || 1.01,
              stake: Number(form.stake.replace(",", ".")) || 1,
            });
            if (ok) onClose();
          }}
        >
          Записать
        </Button>
      </div>
    </Sheet>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  numeric,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  numeric?: boolean;
}) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span className="label">{label}</span>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        inputMode={numeric ? "decimal" : "text"}
        style={{
          minHeight: 44,
          padding: "0 14px",
          borderRadius: "var(--r-m)",
          border: "1px solid var(--hairline)",
          background: "var(--panel-flat)",
          color: "var(--text-1)",
          outline: "none",
        }}
      />
    </label>
  );
}

/* ── КАБИНЕТ ───────────────────────────────────────────────────── */

export function Cabinet() {
  const { session, loadDay } = useStore();
  const [plans, setPlans] = useState<{ code: string; title: string; hint: string; stars: number }[]>([]);
  const [ref, setRef] = useState<{ link: string; total: number; bonus: number } | null>(null);
  const [band, setBand] = useState({ min: "", max: "" });

  useEffect(() => {
    void import("../lib/api").then(({ api }) => api.plans().then((r) => setPlans(r.items)));
    void import("../lib/api").then(({ api }) => api.referral().then(setRef));
    if (session) setBand({ min: String(session.band.min), max: String(session.band.max) });
  }, [session]);

  if (!session) return <Skeleton h={220} />;

  const applyBand = async (min: number | null, max: number | null) => {
    const { api } = await import("../lib/api");
    try {
      const r = await api.setBand(min, max);
      setBand({ min: String(r.min ?? ""), max: String(r.max ?? "") });
      await useStore.getState().bootSession();
      void loadDay();
    } catch (exc) {
      useStore.getState().notify(exc instanceof Error ? exc.message : "не принято", "error");
    }
  };

  return (
    <>
      <Head title="Кабинет" sub="подписка, лимиты и порог отбора" />

      <Panel className="pad stack-2">
        <div className="between">
          <span style={{ fontSize: 16 }}>{session.user.name}</span>
          <span className={`verdict verdict--${session.subscription.active ? "take" : "watch"}`}>
            {session.subscription.plan || "бесплатно"}
          </span>
        </div>
        <KeyValue
          rows={[
            ["id", String(session.user.tgId)],
            ["подписка", session.subscription.until ? `до ${session.subscription.until}` : "нет"],
            ["бесплатных сегодня", `${session.quota.freeLeft}`],
            ["бонусных", `${session.quota.bonus}`],
            ["лимит в сутки", `${session.subscription.dailyLimit}`],
            ["режим бота", session.mode === "paid" ? "платный" : "бесплатный"],
          ]}
        />
      </Panel>

      <Panel>
        <div className="pad" style={{ paddingBottom: 8 }}>
          <span className="label">тарифы</span>
        </div>
        {plans.map((p) => (
          <button
            className="rowline rowline--text"
            key={p.code}
            onClick={async () => {
              const { api } = await import("../lib/api");
              try {
                const link = await api.subscribe(p.code);
                openLink(link.url);
              } catch (exc) {
                useStore.getState().notify(exc instanceof Error ? exc.message : "счёт не создан", "error");
              }
            }}
          >
            <span style={{ display: "grid", gap: 1 }}>
              <span style={{ fontSize: 14.5 }}>{p.title}</span>
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>{p.hint}</span>
            </span>
            <span className="num" style={{ color: "var(--mint-100)" }}>
              {p.stars} звёзд
            </span>
          </button>
        ))}
      </Panel>

      <Panel tone="flat" className="pad stack-2">
        <span className="label">диапазон коэффициентов</span>
        <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
          Разбор покажет только рынки внутри этого коридора.
        </span>
        <div className="grid2">
          <Field label="минимум" value={band.min} numeric onChange={(e) => setBand({ ...band, min: e.target.value })} />
          <Field label="максимум" value={band.max} numeric onChange={(e) => setBand({ ...band, max: e.target.value })} />
        </div>
        <div className="row">
          <Button
            variant="kill"
            onClick={() =>
              void applyBand(Number(band.min.replace(",", ".")) || null, Number(band.max.replace(",", ".")) || null)
            }
          >
            Применить
          </Button>
          <Button variant="ghost" onClick={() => void applyBand(null, null)}>
            Сбросить
          </Button>
        </div>
      </Panel>

      {ref ? (
        <Panel tone="flat" className="pad stack-2">
          <span className="label">пригласить друга</span>
          <span className="muted" style={{ fontSize: "var(--fs-s)" }}>
            {ref.total} приглашено · бонус на счету {ref.bonus}
          </span>
          <Button
            icon="share"
            onClick={() =>
              void navigator.clipboard?.writeText(ref.link).then(() => useStore.getState().notify("ссылка скопирована", "ok"))
            }
          >
            Скопировать ссылку
          </Button>
        </Panel>
      ) : null}
    </>
  );
}

/* ── КОНТРОЛЬ: отдельный контур для владельца ──────────────────── */

export function Control() {
  const { session, adminUnlocked, unlockAdmin, adminDash, adminUsers, adminSettings, loadAdmin, adminTab, notify } = useStore();
  const [password, setPassword] = useState("");

  if (!session?.admin.allowed) {
    return <EmptyState title="Раздел закрыт" hint="Доступ только для владельца бота." />;
  }
  if (!adminUnlocked) {
    return (
      <>
        <Head title="Контроль" sub="нужен пароль администратора — тот же, что в боте" />
        <Panel className="pad stack-2">
          <Field label="пароль" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          <Button
            variant="kill"
            full
            icon="key"
            onClick={async () => {
              if (await unlockAdmin(password)) setPassword("");
            }}
          >
            Войти
          </Button>
        </Panel>
      </>
    );
  }

  return (
    <>
      <Head title="Контроль" sub="живые метрики процесса бота" />
      <div className="row wrap">
        {[
          ["panel", "Сводка"],
          ["live", "Сканер"],
          ["mass", "Масс-анализ"],
          ["users", "Люди"],
          ["cfg", "Настройки"],
        ].map(([id, label]) => (
          <Chip key={id} active={adminTab === id} onClick={() => useStore.setState({ adminTab: id })}>
            {label}
          </Chip>
        ))}
        <Chip onClick={() => void loadAdmin()}>
          <Icon name="refresh" size={14} /> обновить
        </Chip>
      </div>

      {adminTab === "panel" ? <AdminPanel dash={adminDash} /> : null}
      {adminTab === "live" ? <AdminScanner /> : null}
      {adminTab === "mass" ? <AdminMass /> : null}
      {adminTab === "users" ? <AdminUsers users={adminUsers} notify={notify} onDone={loadAdmin} /> : null}
      {adminTab === "cfg" ? <AdminSettings items={adminSettings} onDone={loadAdmin} /> : null}
    </>
  );
}

function AdminPanel({ dash }: { dash: Record<string, any> | null }) {
  if (!dash) return <Skeleton h={220} />;
  const users = dash.users || {};
  const model = dash.model || {};
  const health = dash.health || {};
  const source = dash.source || {};
  return (
    <>
      <div className="grid2">
        <Tile label="пользователей" value={ru(users.total)} hint={`новых за сутки: ${ru(users.new_24h)}`} />
        <Tile label="активных подписок" value={ru(users.active_subscriptions)} hint={`заблокировано: ${ru(users.blocked)}`} />
        <Tile label="расчётных исходов" value={ru(model.settled)} hint={`точность ${ru(model.hitRate)}%`} tone="take" />
        <Tile label="доходность" value={`${ru(model.roi, 1)}%`} hint={`Brier ${ru(model.brier, 3)}`} tone={model.roi >= 0 ? "take" : "miss"} />
      </div>
      <Panel className="pad stack-2">
        <span className="label">состояние</span>
        <KeyValue
          rows={[
            ["источник", source.configured ? "ключ задан" : "ключа нет", source.configured ? "var(--take)" : "var(--miss)"],
            ["внешние источники в расчёте", source.externalAllowed ? "включены" : "выключены"],
            ["последняя сетевая ошибка", source.lastError || "нет"],
            ["резолв исходов", `${ru(health.outcomesResolved)} из ${ru(health.outcomesTotal)}`],
            ["фоновый процесс", health.workerStatus || "неизвестен"],
            ["ошибок запросов", String(health.queryErrors ?? 0)],
          ]}
        />
      </Panel>
    </>
  );
}

function AdminMass() {
  const { job, watchJob, cancelJob, notify } = useStore();
  const [day, setDay] = useState("today");
  const running = job?.status === "running";

  const start = useCallback(async () => {
    const { api } = await import("../lib/api");
    try {
      const { jobId } = await api.admin.mass(day);
      await watchJob(jobId);
    } catch (exc) {
      notify(exc instanceof Error ? exc.message : "не запустилось", "error");
    }
  }, [day, watchJob, notify]);

  useEffect(() => {
    if (job && job.status !== "running" && job.kind === "mass") return;
  }, [job]);

  const result = job?.kind === "mass" ? (job.result as any) : null;

  return (
    <Panel className="pad stack">
      <span className="label">масс-анализ дня</span>
      <div className="row wrap">
        {DAYS.map(([id, label]) => (
          <Chip key={id} active={day === id} onClick={() => setDay(id)}>
            {label}
          </Chip>
        ))}
      </div>
      {job ? <LiquidProgress pct={job.pct} stage={job.stage} /> : null}
      {running ? (
        <Button variant="danger" icon="stop" full onClick={() => void cancelJob()}>
          Остановить
        </Button>
      ) : (
        <Button variant="kill" icon="bolt" full onClick={() => void start()}>
          Запустить
        </Button>
      )}
      {result ? (
        <KeyValue
          rows={[
            ["матчей обработано", `${result.computed} из ${result.total}`],
            ["сигналов", String(result.signals)],
            ["сбоев расчёта", String(result.failed)],
            ["точность по расчётным", `${ru(result.model?.hitRate)}%`],
            ["доходность", `${ru(result.model?.roi, 1)}%`],
          ]}
        />
      ) : null}
      {job?.status === "error" ? <span style={{ color: "var(--miss)", fontSize: "var(--fs-s)" }}>{job.error}</span> : null}
    </Panel>
  );
}

function AdminUsers({
  users,
  notify,
  onDone,
}: {
  users: import("../lib/api").AdminUser[];
  notify: (t: string, tone?: "error" | "ok" | "info") => void;
  onDone: () => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState(users);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => setRows(users), [users]);

  const search = (value: string) => {
    setQ(value);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const { api } = await import("../lib/api");
      try {
        setRows((await api.admin.users(value)).items);
      } catch {
        notify("поиск не удался", "error");
      }
    }, 400);
  };

  const act = async (tgId: number, action: string, amount = 0) => {
    const { api } = await import("../lib/api");
    try {
      await api.admin.userAction(tgId, action, amount);
      notify(action === "bonus" ? "бонус начислен" : "готово", "ok");
      await onDone();
    } catch (exc) {
      notify(exc instanceof Error ? exc.message : "не получилось", "error");
    }
  };

  return (
    <>
      <label className="panel panel--flat row" style={{ padding: "10px 14px", gap: 10 }}>
        <Icon name="search" size={18} style={{ color: "var(--text-3)" }} />
        <input
          value={q}
          onChange={(e) => search(e.target.value)}
          placeholder="имя, @username или id"
          aria-label="Поиск пользователя"
          style={{ flex: 1, border: 0, background: "none", outline: "none", fontSize: 15 }}
        />
      </label>
      <Panel>
        {rows.map((u) => (
          <div key={u.id} className="pad" style={{ borderBottom: "1px solid rgba(156,202,165,.07)", display: "grid", gap: 8 }}>
            <div className="between">
              <span style={{ display: "grid", gap: 1 }}>
                <span style={{ fontSize: 14.5 }}>{u.name}</span>
                <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
                  {u.tgId} · {u.plan || "бесплатно"}
                  {u.until ? ` до ${u.until}` : ""} · бонус {u.bonus} · касса {ru(u.bank, 1)}
                </span>
              </span>
              {u.blocked ? <span className="verdict verdict--skip">блок</span> : null}
            </div>
            <div className="row wrap">
              <Button variant="ghost" icon="plus" onClick={() => void act(u.tgId, "bonus", 5)}>
                +5 прогнозов
              </Button>
              <Button variant="ghost" icon="coin" onClick={() => void act(u.tgId, "bonus", 30)}>
                +30
              </Button>
              <Button variant={u.blocked ? "plain" : "danger"} icon={u.blocked ? "check" : "close"} onClick={() => void act(u.tgId, u.blocked ? "unban" : "ban")}>
                {u.blocked ? "разблокировать" : "заблокировать"}
              </Button>
            </div>
          </div>
        ))}
        {!rows.length ? (
          <div className="pad">
            <span className="muted">Никого не найдено.</span>
          </div>
        ) : null}
      </Panel>
    </>
  );
}

function AdminSettings({ items, onDone }: { items: import("../lib/api").RuntimeSetting[]; onDone: () => Promise<void> }) {
  const notify = useStore((s) => s.notify);
  const groups = useMemo(() => {
    const map = new Map<string, import("../lib/api").RuntimeSetting[]>();
    for (const s of items) map.set(s.category, [...(map.get(s.category) || []), s]);
    return [...map.entries()];
  }, [items]);

  const set = async (key: string, value: unknown) => {
    const { api } = await import("../lib/api");
    try {
      if (typeof value === "boolean") await api.admin.toggleSetting(key);
      else await api.admin.setSetting(key, value);
      await onDone();
    } catch (exc) {
      notify(exc instanceof Error ? exc.message : "настройка не принята", "error");
    }
  };

  if (!items.length) return <Skeleton h={180} />;
  return (
    <>
      {groups.map(([category, list]) => (
        <Panel key={category}>
          <div className="pad" style={{ paddingBottom: 6 }}>
            <span className="label">{category}</span>
          </div>
          {list.map((s) => (
            <div className="rowline rowline--text" key={s.key} style={{ gridTemplateColumns: "1fr auto", cursor: "default" }}>
              <span style={{ display: "grid", gap: 1 }}>
                <span style={{ fontSize: 14 }}>{s.title}</span>
                <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
                  {s.description}
                </span>
              </span>
              {s.kind === "bool" ? (
                <button className="chip" aria-pressed={s.raw === true} onClick={() => void set(s.key, true)}>
                  {s.raw ? "вкл" : "выкл"}
                </button>
              ) : (
                <button
                  className="chip"
                  onClick={() => {
                    const next = window.prompt(`${s.title}\nмин ${s.min ?? "—"} · макс ${s.max ?? "—"}`, String(s.raw ?? ""));
                    if (next !== null) void set(s.key, next);
                  }}
                >
                  <span className="num">{s.value}</span>
                  <Icon name="chev" size={14} />
                </button>
              )}
            </div>
          ))}
        </Panel>
      ))}
    </>
  );
}

export const TABS: TabItem[] = [
  LIVE_TAB,
  { id: "hunt", label: "Охота", icon: "hunt" },
  { id: "feed", label: "Матчи", icon: "pitch" },
  { id: "journal", label: "Дневник", icon: "ledger" },
  { id: "cabinet", label: "Кабинет", icon: "wallet" },
];

export const ADMIN_TAB: TabItem = { id: "control", label: "Контроль", icon: "shield" };

export { LiveSection } from "./live";
