import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button, Sheet } from "../ui/kit";
import { Icon } from "../ui/icons";
import { BrandMark } from "../ui/Brand";
import { NAV, navigate, type Route } from "../lib/router";
import { saveToken } from "../lib/api";
import { useStore } from "../lib/store";
import { useLive } from "../lib/live";
import { inTelegram } from "../lib/telegram";

const ru = (n: number, digits = 0) => n.toFixed(digits).replace(".", ",");

function SessionPill() {
  const session = useStore((s) => s.session);
  if (!session) return null;
  const plan = session.subscription.active ? session.subscription.plan || "подписка" : "бесплатно";
  return (
    <div className="row" style={{ gap: 8 }}>
      <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
        {session.user.name || session.user.username || String(session.user.tgId)}
      </span>
      <span className="verdict verdict--watch">{plan}</span>
    </div>
  );
}

function LoginSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const bootSession = useStore((s) => s.bootSession);
  const [key, setKey] = useState("");
  const [note, setNote] = useState("");

  const apply = async () => {
    const value = key.trim();
    if (!value) {
      setNote("ключ пустой");
      return;
    }
    saveToken(value);
    setKey("");
    setNote("");
    onClose();
    await bootSession();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Вход в кабинет">
      <div className="stack">
        <p className="lede" style={{ fontSize: "var(--fs-s)" }}>
          Основной вход — через бота в Telegram: он подписывает сессию и выдаёт ключ. Если ты
          проверяешь сайт с компьютера, вставь ключ, полученный от бота.
        </p>
        {inTelegram() ? (
          <p className="muted" style={{ fontSize: "var(--fs-s)" }}>
            Ты внутри Telegram — сессия подхватится сама.
          </p>
        ) : null}
        <label className="stack-2">
          <span className="label">ключ доступа</span>
          <input
            className="input"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="вставить ключ"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        {note ? <span style={{ color: "var(--miss)", fontSize: "var(--fs-s)" }}>{note}</span> : null}
        <div className="row">
          <Button variant="kill" onClick={() => void apply()}>
            войти
          </Button>
          <Button variant="ghost" onClick={onClose}>
            позже
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

export function SiteHeader({ route }: { route: Route }) {
  const session = useStore((s) => s.session);
  const [login, setLogin] = useState(false);

  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <div className="logo" onClick={() => navigate("/")}>
          <BrandMark size={34} />
          <span className="logo__text">РАПТОР</span>
        </div>

        <nav className="site-nav">
          {NAV.map((item) => (
            <a
              key={item.path}
              href={`#${item.path}`}
              data-active={route.path === item.path ? "1" : "0"}
              onClick={() => useLive.setState({ page: 0 })}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <SessionPill />
          {session?.admin.allowed ? (
            <a href={`#/admin`} className="chip" aria-pressed={route.path === "/admin" ? "true" : "false"}>
              <Icon name="shield" size={14} /> админ
            </a>
          ) : null}
          {!session ? (
            <Button variant="kill" onClick={() => setLogin(true)}>
              войти
            </Button>
          ) : null}
        </div>
      </div>
      <LoginSheet open={login} onClose={() => setLogin(false)} />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="site-footer__grid">
          <div className="stack-2">
            <div className="logo">
              <BrandMark size={30} />
              <span className="logo__text">РАПТОР</span>
            </div>
            <p className="muted" style={{ fontSize: "var(--fs-s)", maxWidth: 360 }}>
              Live-сканер матчей: темп, давление и линия в реальном времени. Один сигнал на событие,
              с указанием срока актуальности и настоящих котировок.
            </p>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>
              разделы
            </div>
            {NAV.map((item) => (
              <a key={item.path} href={`#${item.path}`}>
                {item.label}
              </a>
            ))}
          </div>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>
              важное
            </div>
            <a href="#/tarify">Тарифы и лимиты</a>
            <a href="#/kabinet">Подписка и ограничения</a>
            <a href="#/journal">Журнал ставок</a>
          </div>
        </div>
        <p className="disclaimer">
          18+. Ставки — это риск, а не заработок: ничья и проигрыш серии входят в сценарий. Раптор
          публикует аргументированные прогнозы, а не гарантии. Вероятности модели откалиброваны по
          разбору сыгранных матчей и показаны вместе с источником данных — там, где данных нет, их
          не выдумывают.
        </p>
      </div>
    </footer>
  );
}

export function SiteShell({ route, children }: { route: Route; children: ReactNode }) {
  return (
    <div className="site">
      <SiteHeader route={route} />
      <AnimatePresence mode="wait">
        <motion.main
          key={route.path}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.main>
      </AnimatePresence>
      <SiteFooter />
    </div>
  );
}

export function StatStrip({
  published,
  resolved,
  hitRate,
  roi,
}: {
  published: number;
  resolved: number;
  hitRate: number | null;
  roi: number | null;
}) {
  return (
    <div className="metrics">
      <div className="metric">
        <span className="label">опубликовано</span>
        <b>{ru(published)}</b>
        <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
          прогнозов в канале
        </span>
      </div>
      <div className="metric">
        <span className="label">разобрано</span>
        <b>{ru(resolved)}</b>
        <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
          дошли до свистка
        </span>
      </div>
      <div className="metric">
        <span className="label">точность</span>
        <b>{hitRate === null ? "—" : `${ru(hitRate, 1)}%`}</b>
        <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
          зашедших разборов
        </span>
      </div>
      <div className="metric">
        <span className="label">доходность</span>
        <b style={{ color: roi === null || roi >= 0 ? "var(--mint-100)" : "var(--miss)" }}>
          {roi === null ? "—" : `${roi > 0 ? "+" : ""}${ru(roi, 1)}%`}
        </b>
        <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
          плоская ставка на разбор
        </span>
      </div>
    </div>
  );
}
