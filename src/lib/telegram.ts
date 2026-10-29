/** Обёртка Telegram WebApp SDK: в браузере вне Telegram работает mock,
 *  чтобы разработка шла без клиента. Никакой логики доступа здесь нет —
 *  роль определяется только на сервере по initData. */

export type TgUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
};

type HapticStyle = "light" | "medium" | "heavy" | "rigid" | "soft";

const w = () => (window as unknown as { Telegram?: { WebApp?: any } }).Telegram?.WebApp;

export const inTelegram = (): boolean => {
  const app = w();
  return !!app && app.initData !== undefined && app.platform !== "";
};

export function ready(): void {
  const app = w();
  if (!app) return;
  app.ready();
  app.expand?.();
  try {
    app.setHeaderColor?.("#060A08");
    app.setBackgroundColor?.("#060A08");
    app.disableVerticalSwipes?.();
  } catch {
    /* старые клиенты молча игнорируют */
  }
}

export function currentUser(): TgUser | null {
  const app = w();
  const u = app?.initDataUnsafe?.user;
  return u ? { id: u.id, username: u.username, first_name: u.first_name, last_name: u.last_name, language_code: u.language_code } : null;
}

export function rawInitData(): string {
  const fromTg = String(w()?.initData ?? "");
  if (fromTg) return fromTg;
  // Крюк только для разработки: dev-сборка умеет принимать подпись извне,
  // чтобы интерфейс можно было гонять без клиента Telegram. В продакшн
  // бандле эта ветка вырезается сборщиком.
  if (import.meta.env.DEV) {
    return String((window as unknown as { __RAPTOR_INIT_DATA__?: string }).__RAPTOR_INIT_DATA__ ?? "");
  }
  return "";
}

export function startParam(): string {
  const p = w()?.initDataUnsafe?.start_param;
  return p ? String(p) : "";
}

export function haptic(kind: "impact" | "notification" | "selection", style: HapticStyle | "error" | "success" | "warning" = "light"): void {
  const h = w()?.HapticFeedback;
  if (!h) return;
  try {
    if (kind === "impact") h.impactOccurred(style);
    else if (kind === "notification") h.notificationOccurred(style);
    else h.selectionChanged();
  } catch {
    /* нет виброотклика — не беда */
  }
}

export const back = {
  show(onClick: () => void) {
    const b = w()?.BackButton;
    if (!b) return;
    b.offClick?.(b._rh ?? (() => {}));
    b._rh = onClick;
    b.onClick(onClick);
    b.show();
  },
  hide() {
    w()?.BackButton?.hide?.();
  },
};

export const mainBtn = {
  show(text: string, onClick: () => void, opts: { color?: boolean; disabled?: boolean } = {}) {
    const m = w()?.MainButton;
    if (!m) return;
    m.offClick?.(m._rh ?? (() => {}));
    m._rh = onClick;
    try {
      m.setText(text);
      if (m.setButtonType) m.setButtonType(opts.color === false ? "destructive" : "default");
      m.show();
      opts.disabled ? m.disable() : m.enable();
    } catch {
      /* older SDK */
    }
    m.onClick(onClick);
  },
  hide() {
    w()?.MainButton?.hide?.();
  },
};

export function share(text: string, url: string): void {
  const app = w();
  if (app?.switchInlineQuery) {
    app.switchInlineQuery(`${text} ${url}`, ["users", "groups", "channels"]);
    return;
  }
  navigator.clipboard?.writeText(`${text} ${url}`).catch(() => {});
}

export function openLink(url: string): void {
  const app = w();
  if (app?.openLink) app.openLink(url);
  else window.open(url, "_blank");
}
