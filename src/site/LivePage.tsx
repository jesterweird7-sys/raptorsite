import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button, Chip, Skeleton } from "../ui/kit";
import { Icon } from "../ui/icons";
import { LiveMatch, SettingsSheet } from "../screens/live";
import { minutesLeft, useLive } from "../lib/live";
import type { LiveRow } from "../lib/api";
import { haptic } from "../lib/telegram";

const ru = (n: number, digits = 2) => n.toFixed(digits).replace(".", ",");

const SORT_LABEL: Record<string, string> = {
  stats: "со статистикой",
  hotness: "по интересу",
  minute: "по минуте",
  signals: "по сигналам",
};

export function Gate() {
  return (
    <div className="panel pad" style={{ display: "grid", gap: "var(--sp-3)", textAlign: "center" }}>
      <h2 className="h2" style={{ fontSize: 22 }}>
        Табло за входом
      </h2>
      <p className="lede" style={{ margin: "0 auto", fontSize: "var(--fs-s)" }}>
        Лента сканера привязана к аккаунту: фильтры, лимиты и подписка на push живут в кабинете.
        Открой приложение из бота — сессия подхватится сама, либо вставь ключ доступа в окне входа.
      </p>
    </div>
  );
}

function Row({
  row,
  active,
  fresh,
  age,
  onSelect,
}: {
  row: LiveRow;
  active: boolean;
  fresh: boolean;
  age: number;
  onSelect: () => void;
}) {
  const signal = row.signal;
  const left = signal ? minutesLeft(row.minute, signal.untilMinute, age) : 0;
  return (
    <motion.button
      layout
      type="button"
      className="board__row"
      data-active={active ? "1" : "0"}
      data-fresh={fresh ? "1" : "0"}
      onClick={onSelect}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -18 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="board__minute">
        {row.minute}
        <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-3)" }}>'</span>
      </span>
      <span className="board__teams">
        <b>
          {row.home} — {row.away}
        </b>
        <span>
          {row.league}
          {row.country ? ` · ${row.country}` : ""} · {row.dataState}
        </span>
      </span>
      <span className="board__score">{row.score || "—"}</span>
      <span className="board__metrics muted" style={{ fontSize: "var(--fs-xs)" }}>
        🎯 {row.sot || "—"} · 📈 {row.xg || "—"} · ⚡ {ru(row.gsi)}
      </span>
      <span className="board__signal">
        {signal ? (
          signal.noBet ? (
            <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
              наблюдение: {signal.title}
            </span>
          ) : (
            <>
              <span className="board__bet">
                {signal.market.startsWith("OVER:")
                  ? `ТБ ${signal.market.slice(5).replace(".", ",")}`
                  : signal.market}{" "}
                @ {ru(signal.odds)}
              </span>
              <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
                {Math.round(signal.probability * 100)}% · перевес {signal.evPct > 0 ? "+" : ""}
                {ru(signal.evPct, 1)}% · до {signal.untilMinute}'
              </span>
              <span className="deadline-track" style={{ height: 4 }}>
                <motion.span
                  className="deadline-fill"
                  initial={false}
                  animate={{
                    width: `${Math.max(0, Math.min(1, left / Math.max(1, signal.validMinutes || 15))) * 100}%`,
                  }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
            </>
          )
        ) : (
          <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
            {row.near.length ? `близко: ${row.near[0]}` : "сценариев не совпало"}
          </span>
        )}
      </span>
    </motion.button>
  );
}

export function LivePage() {
  return <LivePageInner />;
}

function LivePageInner() {
  const board = useLive((s) => s.board);
  const busy = useLive((s) => s.boardBusy);
  const error = useLive((s) => s.boardError);
  const stream = useLive((s) => s.stream);
  const fresh = useLive((s) => s.fresh);
  const clock = useLive((s) => s.clock);
  const filters = useLive((s) => s.filters);
  const gameId = useLive((s) => s.gameId);
  const start = useLive((s) => s.start);
  const stop = useLive((s) => s.stop);
  const openGame = useLive((s) => s.openGame);
  const closeGame = useLive((s) => s.closeGame);
  const setPage = useLive((s) => s.setPage);
  const refresh = useLive((s) => s.refresh);
  const saveFilters = useLive((s) => s.saveFilters);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    start();
    return () => {
      stop();
      closeGame();
    };
  }, [start, stop, closeGame]);

  const age = (() => {
    if (!board) return Number.POSITIVE_INFINITY;
    const base = board.updated ? new Date(board.updated).getTime() : 0;
    return base ? Math.max(0, (clock - base) / 1000) : board.ageSeconds;
  })();

  const rows = board?.rows ?? [];
  const onlyStats = !!filters?.only_stats;

  return (
    <div className="shell section section--tight">
      <div className="between" style={{ marginBottom: "var(--sp-4)", flexWrap: "wrap", gap: "var(--sp-3)" }}>
        <div>
          <span className="eyebrow">
            <span className="live-dot" data-live={stream === "live" ? "1" : "0"}>
              <i />
            </span>
            {stream === "live" ? "поток активен" : "опрос каждые 8 с"}
          </span>
          <h1 className="h2" style={{ marginTop: 10 }}>
            Живое табло
          </h1>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: "var(--fs-s)" }}>
            {board
              ? `в эфире ${board.live} · со статистикой ${board.covered} · отобрано ${board.total} · ${Math.round(age)} с назад`
              : "загружаем эфир…"}
          </p>
        </div>
        <div className="row wrap">
          <Chip active={onlyStats} onClick={() => void saveFilters({ only_stats: !onlyStats })}>
            📊 со статистикой
          </Chip>
          <Chip onClick={() => void refresh()}>
            <Icon name="refresh" size={15} /> обновить
          </Chip>
          <Button variant="ghost" onClick={() => setSheet(true)}>
            <Icon name="filter" size={15} /> фильтры и push
          </Button>
        </div>
      </div>

      {error ? (
        <p style={{ color: "var(--miss)", fontSize: "var(--fs-s)" }}>{error}</p>
      ) : null}

      <div className="live-grid">
        <div className="board">
          <div className="board__head">
            <span>мин</span>
            <span>матч</span>
            <span>счёт</span>
            <span className="board__metrics">поле</span>
            <span>сигнал</span>
          </div>

          {!board && busy ? (
            <div style={{ padding: "var(--sp-4)", display: "grid", gap: "var(--sp-3)" }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} h={62} />
              ))}
            </div>
          ) : null}

          {board && !rows.length ? (
            <p className="muted" style={{ padding: "var(--sp-5)", textAlign: "center" }}>
              Под фильтры ничего не подходит: ослабь диапазон минут или порог интереса.
            </p>
          ) : null}

          <AnimatePresence initial={false}>
            {rows.map((row) => (
              <Row
                key={row.gameId}
                row={row}
                active={gameId === row.gameId}
                fresh={fresh.includes(row.gameId)}
                age={age}
                onSelect={() => {
                  haptic("impact", "medium");
                  void openGame(row.gameId);
                }}
              />
            ))}
          </AnimatePresence>

          {board && board.pages > 1 ? (
            <div className="between" style={{ padding: "10px var(--sp-4)" }}>
              <Button variant="ghost" onClick={() => void setPage(Math.max(0, board.page - 1))} disabled={board.page === 0}>
                <Icon name="back" size={15} />
              </Button>
              <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
                {board.page + 1} / {board.pages} · сортировка: {SORT_LABEL[String(filters?.sort ?? "stats")]}
              </span>
              <Button
                variant="ghost"
                onClick={() => void setPage(Math.min(board.pages - 1, board.page + 1))}
                disabled={board.page + 1 >= board.pages}
              >
                <Icon name="chev" size={15} />
              </Button>
            </div>
          ) : null}
        </div>

        <aside className="detail-pane">
          {gameId === null ? (
            <div className="panel pad" style={{ display: "grid", gap: 6 }}>
              <span className="label">разбор матча</span>
              <p className="muted" style={{ margin: 0, fontSize: "var(--fs-s)" }}>
                Выбери строку слева: здесь появится сигнал, причины, срок актуальности и основа
                ставки на гол.
              </p>
            </div>
          ) : (
            <div className="panel pad">
              <LiveMatch gameId={gameId} onBack={closeGame} backLabel="закрыть" />
            </div>
          )}
        </aside>
      </div>

      <SettingsSheet open={sheet} onClose={() => setSheet(false)} />
    </div>
  );
}
