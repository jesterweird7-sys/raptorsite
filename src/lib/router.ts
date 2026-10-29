import { useEffect, useState } from "react";

/** Хэш-роутер: сайт живёт в /app/ рядом с мини-аппом Telegram, а серверных
 *  rewrite'ов у нас нет — адрес после # не требует настройки Caddy. */

export type Route = {
  path: string;
  query: URLSearchParams;
};

function current(): Route {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [path, qs] = raw.split("?");
  return {
    path: path.replace(/\/+$/, "") || "/",
    query: new URLSearchParams(qs || ""),
  };
}

export function navigate(to: string): void {
  if (window.location.hash === `#${to}`) return;
  window.location.hash = to;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(current);

  useEffect(() => {
    const sync = () => {
      setRoute(current());
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return route;
}

export const ROUTES = {
  home: "/",
  live: "/live",
  matches: "/matches",
  journal: "/journal",
  pricing: "/tarify",
  account: "/kabinet",
  admin: "/admin",
} as const;

/** Узкий экран: на телефоне нижняя навигация удобнее горизонтального меню. */
export function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 900px)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const sync = () => setNarrow(mq.matches);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return narrow;
}

export const NAV: { path: string; label: string; app: string }[] = [
  { path: ROUTES.home, label: "Главная", app: "hunt" },
  { path: ROUTES.live, label: "Лайв", app: "live" },
  { path: ROUTES.matches, label: "Линия дня", app: "feed" },
  { path: ROUTES.journal, label: "Дневник", app: "journal" },
  { path: ROUTES.pricing, label: "Тарифы", app: "cabinet" },
  { path: ROUTES.account, label: "Кабинет", app: "cabinet" },
];
