import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Button, Counter } from "../ui/kit";
import { Icon } from "../ui/icons";
import { api, RequestError, type Plan, type PublicResults } from "../lib/api";
import { navigate } from "../lib/router";
import { StatStrip } from "./Layout";
import { useStore } from "../lib/store";

const rise = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
};

const STEPS: [string, string, string][] = [
  [
    "01",
    "Источник",
    "Сканер снимает живую картину матча: счёт, минута, удары в створ, штрафные, угловые, владение, xG и линия букмекера. Если метрик нет, они не подменяются нулями — матч уходит в ленту с пометкой «без статистики».",
  ],
  [
    "02",
    "Темп, а не один кадр",
    "Момент считается по окнам 5, 10 и 15 минут с усреднением: всплеск за три минуты не разгоняет модель, а затяжной прессинг — разгоняет. Отдельно смотрим на весь матч: сколько голов в минуту идёт и как счёт меняет осторожность команд.",
  ],
  [
    "03",
    "Сценарии и один вывод",
    "Семнадцать сценариев проверяют матч одновременно. Если несколько из них ведут к одной ставке, в ленту выходит главный — самый сильный, а остальные подписаны подтверждающими. Три одинаковых предложения — это не три довода.",
  ],
  [
    "04",
    "Цена и срок",
    "Ставка берётся по настоящей котировке на общий тотал «ещё один гол любой команды» в коридоре 1,40–3,00 с положительным перевесом. У сигнала есть срок: он не переживает перерыв и истекать должен со свистком, а не «когда-нибудь».",
  ],
];

const WATCH: [string, string, string][] = [
  ["pulse", "Давление вместо владения", "Удары в створ, большой момент и xG весят больше, чем 65% владения без угрозы. Владение — последний аргумент, а не первый."],
  ["clock", "Срок до свистка", "Каждый сигнал живёт до конкретной минуты. На 45-й и 90-й цикл замолкает: после перерыва команды возвращаются другие."],
  ["shield", "Качество данных", "🟢 — метрик достаточно, 🟡 — часть показателей отсутствует, 🔴 — источник замолчал. Красная карточка не отправляется как свежая."],
  ["bolt", "Калибровка в фоне", "Модель сверяет заявления с результатом по разбору сыгранных матчей. Завышенные вероятности режутся кривой надёжности, а не рисуются как есть."],
];

const FAQ: [string, string][] = [
  ["Почему сигналов мало?", "Потому что совпадение сценария и годной цены — редкость. Дешевле не выдумывать, чем присылать мусор: наблюдение остаётся в ленте, но человеку не пишется, если котировка вне коридора или перевес отрицательный."],
  ["Почему ставка всегда на «ещё один гол»?", "Это единственное событие в футболе, которое не требует угадать, кто именно забьёт и кто выиграет. Модель считает интенсивность голов матча, а не исход."],
  ["Откуда коэффициенты?", "Из линии источника вместе со снимком матча. Если цены на нужный рынок нет, сигнал остаётся наблюдением — приблизительную котировку мы не подставляем."],
  ["Можно ли доверять вероятности?", "Смотрите на качество данных и на перевес. Вероятность модели без разницы с рынком — это просто мнение; калибровка показывает, насколько модель в среднем не завышает."],
];

function outcomeLabel(row: PublicResults["items"][number]): { kind: string; text: string } {
  if (row.outcome === "hit") return { kind: "hit", text: "зашло" };
  if (row.outcome === "miss") return { kind: "miss", text: "мимо" };
  return { kind: "wait", text: "в игре" };
}

export function Home() {
  const [feed, setFeed] = useState<PublicResults | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState("");
  const session = useStore((s) => s.session);

  useEffect(() => {
    void (async () => {
      try {
        setFeed(await api.publicResults(30));
      } catch (exc) {
        if (exc instanceof RequestError && exc.status === 404) {
          setError("витрина результатов выключена в настройках");
          return;
        }
        setError("лента результатов не ответила");
      }
    })();
    void (async () => {
      try {
        setPlans((await api.publicPlans()).items);
      } catch {
        /* каталог не критичен для остальной страницы */
      }
    })();
  }, []);

  const stats = feed?.stats;

  return (
    <>
      <section className="shell hero">
        <span className="hero__glow" aria-hidden="true" />
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} style={{ display: "grid", gap: "var(--sp-4)", position: "relative" }}>
          <span className="eyebrow">
            <span className="live-dot" data-live="1">
              <i />
            </span>
            live-сканер футбола
          </span>
          <h1 className="h1">
            Раптор смотрит матч
            <br />
            и ждёт один гол
          </h1>
          <p className="lede">
            Сканер снимает темп, давление и линию каждые двадцать секунд, прогоняет их через
            семнадцать сценариев и оставляет в ленте только то, что можно играть по настоящей
            котировке — с указанием минуты, до которой сигнал остаётся правдой.
          </p>
          <div className="hero__cta">
            <Button variant="kill" onClick={() => navigate("/live")}>
              <Icon name="pulse" size={18} /> открыть живое табло
            </Button>
            <Button variant="plain" onClick={() => navigate("/tarify")}>
              тарифы
            </Button>
          </div>
          {!session ? (
            <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
              вход через бота в Telegram — кнопка «Открыть приложение»
            </span>
          ) : null}
        </motion.div>

        <motion.div {...rise} className="panel pad" style={{ display: "grid", gap: "var(--sp-3)" }}>
          <div className="between">
            <span className="label">последние публикации</span>
            <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
              {feed ? `${feed.items.length} записей` : "—"}
            </span>
          </div>
          {error ? (
            <p className="muted" style={{ fontSize: "var(--fs-s)", margin: 0 }}>{error}</p>
          ) : null}
          {(feed?.items ?? []).slice(0, 4).map((row) => {
            const outcome = outcomeLabel(row);
            return (
              <div className="kv" key={row.game_id}>
                <span style={{ minWidth: 0 }}>
                  <b style={{ fontWeight: 600 }}>{row.match}</b>
                  <span className="muted" style={{ display: "block", fontSize: "var(--fs-xs)" }}>
                    {row.market} {row.odds ? `@ ${row.odds.toFixed(2).replace(".", ",")}` : ""}
                  </span>
                </span>
                <span className={`outcome outcome--${outcome.kind}`}>{outcome.text}</span>
              </div>
            );
          })}
          {!feed && !error ? (
            <>
              <span className="skl" style={{ height: 34 }} />
              <span className="skl" style={{ height: 34 }} />
            </>
          ) : null}
        </motion.div>
      </section>

      <section className="shell section section--tight">
        {stats ? (
          <StatStrip
            published={stats.published}
            resolved={stats.resolved}
            hitRate={stats.hit_rate_percent}
            roi={stats.roi_percent}
          />
        ) : (
          <div className="metrics">
            {[0, 1, 2, 3].map((i) => (
              <span className="skl metric" key={i} style={{ height: 96 }} />
            ))}
          </div>
        )}
        <p className="muted" style={{ fontSize: "var(--fs-xs)", margin: 0 }}>
          цифры считаются по опубликованным в канале разборам и разобраным исходам — не по «красивым
          скриншотам».
        </p>
      </section>

      <section className="shell section" id="kak">
        <motion.div {...rise} style={{ display: "grid", gap: "var(--sp-3)" }}>
          <span className="eyebrow">как это работает</span>
          <h2 className="h2">Четыре шага от снимка матча до ставки</h2>
        </motion.div>
        <div className="steps">
          {STEPS.map(([num, title, text], index) => (
            <motion.div
              key={num}
              initial={{ opacity: 0, x: -14 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="step"
            >
              <span className="step__mark">{num}</span>
              <div>
                <b style={{ display: "block", marginBottom: 4 }}>{title}</b>
                <span className="muted" style={{ fontSize: "var(--fs-s)", lineHeight: 1.6 }}>
                  {text}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="shell section">
        <motion.div {...rise} style={{ display: "grid", gap: "var(--sp-3)" }}>
          <span className="eyebrow">что под капотом</span>
          <h2 className="h2">На что смотрит сканер — и на что нет</h2>
        </motion.div>
        <div className="cards">
          {WATCH.map(([icon, title, text], index) => (
            <motion.div
              key={title}
              {...rise}
              transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="card-tile"
            >
              <span style={{ color: "var(--sage-300)" }}>
                <Icon name={icon as "pulse"} size={22} />
              </span>
              <b>{title}</b>
              <span className="muted" style={{ fontSize: "var(--fs-s)", lineHeight: 1.55 }}>
                {text}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="shell section">
        <motion.div {...rise} style={{ display: "grid", gap: "var(--sp-3)" }}>
          <span className="eyebrow">доказательства</span>
          <h2 className="h2">Опубликовано — разобрано — как кончилось</h2>
          <p className="lede">
            Тот же список, что уходит в канал. Итог подтягивается из разбора исходов и не правится
            задним числом.
          </p>
        </motion.div>

        <div className="panel" style={{ overflowX: "auto" }}>
          <table className="proof">
            <thead>
              <tr>
                <th>матч</th>
                <th>рынок</th>
                <th>кф</th>
                <th>модель</th>
                <th>перевес</th>
                <th>итог</th>
              </tr>
            </thead>
            <tbody>
              {(feed?.items ?? []).slice(0, 12).map((row) => {
                const outcome = outcomeLabel(row);
                return (
                  <tr key={row.game_id}>
                    <td>
                      <b style={{ fontWeight: 600 }}>{row.match}</b>
                      <span className="muted" style={{ display: "block", fontSize: "var(--fs-xs)" }}>
                        {row.league}
                      </span>
                    </td>
                    <td>{row.market}</td>
                    <td className="num">{row.odds ? row.odds.toFixed(2).replace(".", ",") : "—"}</td>
                    <td className="num">{row.probability_percent || "—"}</td>
                    <td className="num">{row.edge_percent || "—"}</td>
                    <td>
                      <span className={`outcome outcome--${outcome.kind}`}>{outcome.text}</span>
                    </td>
                  </tr>
                );
              })}
              {!feed ? (
                <tr>
                  <td colSpan={6} className="muted">
                    {error || "загружаем…"}
                  </td>
                </tr>
              ) : null}
              {feed && !feed.items.length ? (
                <tr>
                  <td colSpan={6} className="muted">
                    публикаций пока нет — автопубликация только что заработала
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {plans.length ? (
        <section className="shell section" id="tarify">
          <motion.div {...rise} style={{ display: "grid", gap: "var(--sp-3)" }}>
            <span className="eyebrow">тарифы</span>
            <h2 className="h2">Сколько стоит доступ</h2>
            <p className="lede">
              Оплата звёздами Telegram или USDT. Лимит расчётов в сутки и срок подписки — те же, что
              показывает кабинет.
            </p>
          </motion.div>
          <div className="plans">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.code}
                {...rise}
                transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className={`plan${plan.badge ? " plan--best" : ""}`}
              >
                {plan.badge ? <span className="plan__badge">{plan.badge}</span> : null}
                <b>{plan.title}</b>
                <div className="plan__price">
                  {plan.stars ? (
                    <>
                      <Counter value={plan.stars} digits={0} className="num" />
                      <span className="muted" style={{ fontSize: "var(--fs-s)" }}>
                        ⭐
                      </span>
                    </>
                  ) : (
                    <span className="num">{`$${plan.usdt}`}</span>
                  )}
                </div>
                <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
                  {plan.hint || `${plan.days} дней доступа`}
                </span>
                <Button variant="plain" full onClick={() => navigate("/kabinet")}>
                  подключить
                </Button>
              </motion.div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="shell section">
        <motion.div {...rise} style={{ display: "grid", gap: "var(--sp-3)" }}>
          <span className="eyebrow">вопросы</span>
          <h2 className="h2">Коротко о честном</h2>
        </motion.div>
        <div className="panel pad stack">
          {FAQ.map(([q, a]) => (
            <details className="ask" key={q}>
              <summary>
                {q}
                <Icon name="down" size={16} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="shell section section--tight">
        <div className="panel pad between" style={{ flexWrap: "wrap", gap: "var(--sp-4)" }}>
          <div>
            <h2 className="h2" style={{ fontSize: 24 }}>
              Табло живёт само
            </h2>
            <p className="muted" style={{ margin: "6px 0 0", fontSize: "var(--fs-s)" }}>
              Обновления приходят потоком, без перезагрузки страницы.
            </p>
          </div>
          <Button variant="kill" onClick={() => navigate("/live")}>
            <Icon name="pulse" size={18} /> открыть табло
          </Button>
        </div>
      </section>
    </>
  );
}
