import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BrandMark } from "./ui/Brand";
import { TabBar, type TabItem } from "./ui/kit";
import { Icon } from "./ui/icons";
import { Cabinet, Control, Feed, Hunt, Journal, MatchScreen, Notice } from "./screens";
import { Gate, LivePage } from "./site/LivePage";
import { Home } from "./site/Home";
import { Pricing } from "./site/Pricing";
import { SiteFooter, SiteHeader } from "./site/Layout";
import { ROUTES, navigate, useNarrow, useRoute } from "./lib/router";
import { useStore } from "./lib/store";
import { inTelegram } from "./lib/telegram";

const ADMIN_ITEM: TabItem = { id: ROUTES.admin, label: "Админ", icon: "shield" };

const TABS_TO_SITE: TabItem[] = [
  { id: ROUTES.home, label: "Главная", icon: "spark" },
  { id: ROUTES.live, label: "Лайв", icon: "pulse" },
  { id: ROUTES.matches, label: "Линия", icon: "pitch" },
  { id: ROUTES.journal, label: "Дневник", icon: "ledger" },
  { id: ROUTES.account, label: "Кабинет", icon: "wallet" },
];

/** Узкий экран: мобильные экраны бота живут в колонке 460 px. */
function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <div className="screen">{children}</div>
    </div>
  );
}

export default function App() {
  const boot = useStore((s) => s.boot);
  const bootError = useStore((s) => s.bootError);
  const session = useStore((s) => s.session);
  const bootSession = useStore((s) => s.bootSession);
  const route = useRoute();
  const narrow = useNarrow();
  const [matchId, setMatchId] = useState<number | null>(null);

  useEffect(() => {
    void bootSession();
  }, [bootSession]);

  useEffect(() => {
    document.documentElement.dataset.scope = route.path === ROUTES.admin ? "admin" : "app";
  }, [route.path]);

  if (boot === "loading") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "grid",
          placeItems: "center",
          alignContent: "center",
          gap: "var(--sp-5)",
        }}
      >
        <BrandMark size={120} />
        <span className="brand">РАПТОР</span>
      </div>
    );
  }

  const authed = Boolean(session);

  const page = () => {
    switch (route.path) {
      case ROUTES.live:
        return authed ? <LivePage /> : <AppFrame><Gate /></AppFrame>;
      case ROUTES.matches:
        return authed ? (
          <AppFrame>
            {matchId !== null ? (
              <MatchScreen gameId={matchId} onBack={() => setMatchId(null)} />
            ) : (
              <Feed onOpen={setMatchId} />
            )}
          </AppFrame>
        ) : (
          <AppFrame>
            <Gate />
          </AppFrame>
        );
      case ROUTES.journal:
        return authed ? (
          <AppFrame>
            <Journal />
          </AppFrame>
        ) : (
          <AppFrame>
            <Gate />
          </AppFrame>
        );
      case ROUTES.pricing:
        return <Pricing />;
      case ROUTES.account:
        return authed ? (
          <AppFrame>
            <Cabinet />
          </AppFrame>
        ) : (
          <AppFrame>
            <Gate />
          </AppFrame>
        );
      case ROUTES.admin:
        return authed && session?.admin.allowed ? (
          <AppFrame>
            <Control />
          </AppFrame>
        ) : (
          <AppFrame>
            <Gate />
          </AppFrame>
        );
      default:
        return (
          <>
            <Home />
            {authed ? (
              <div className="shell section section--tight">
                <div className="panel pad between" style={{ flexWrap: "wrap", gap: "var(--sp-4)" }}>
                  <div>
                    <span className="label">подборки на сегодня</span>
                    <p className="muted" style={{ margin: "4px 0 0", fontSize: "var(--fs-s)" }}>
                      Охота — это отобранные матчи дня с разбором: открывай в табло или в линии.
                    </p>
                  </div>
                  <div className="row">
                    <button className="btn btn--kill" onClick={() => navigate(ROUTES.live)}>
                      <Icon name="pulse" size={17} /> табло
                    </button>
                    <button className="btn" onClick={() => navigate(ROUTES.matches)}>
                      <Icon name="pitch" size={17} /> линия дня
                    </button>
                  </div>
                </div>
                <AppFrame>
                  <Hunt onOpen={setMatchId} go={(id) => navigate(id === "feed" ? ROUTES.matches : ROUTES.live)} />
                </AppFrame>
              </div>
            ) : null}
          </>
        );
    }
  };

  return (
    <div className="site">
      <SiteHeader route={route} />

      <div style={{ paddingTop: "var(--sp-4)" }}>
        <div className="shell">
          <Notice />
        </div>
        {boot === "error" && !authed ? (
          <div className="shell section section--tight">
            <div className="panel pad" style={{ textAlign: "center", display: "grid", gap: 6 }}>
              <h2 style={{ fontSize: "var(--fs-h2)", margin: 0 }}>{session ? "" : "Только из Telegram"}</h2>
              <p className="muted" style={{ margin: 0, fontSize: "var(--fs-s)" }}>
                {bootError}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <AnimatePresence mode="wait">
        <motion.main
          key={route.path + (matchId ?? "")}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {page()}
        </motion.main>
      </AnimatePresence>

      <SiteFooter />

      {inTelegram() || narrow ? (
        <TabBar
          items={session?.admin.allowed ? [...TABS_TO_SITE, ADMIN_ITEM] : TABS_TO_SITE}
          active={route.path}
          onChange={(id) => navigate(id)}
        />
      ) : null}
    </div>
  );
}
