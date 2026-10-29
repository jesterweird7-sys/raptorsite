import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";
import { animate } from "motion";
import { Icon, type IconName } from "./icons";
import { haptic } from "../lib/telegram";

const vars = (o: Record<string, string | number>): CSSProperties => o as CSSProperties;

/* ── поверхность ────────────────────────────────────────────────── */

export function Panel({
  children,
  tone = "default",
  className = "",
  style,
}: {
  children?: ReactNode;
  tone?: "default" | "flat" | "strong";
  className?: string;
  style?: CSSProperties;
}) {
  const cls = tone === "flat" ? "panel--flat" : tone === "strong" ? "panel--strong" : "";
  return (
    <div className={`panel ${cls} ${className}`} style={style}>
      {children}
    </div>
  );
}

/* ── действия ───────────────────────────────────────────────────── */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "kill" | "ghost" | "danger" | "plain";
  icon?: IconName;
  full?: boolean;
};

export function Button({ variant = "plain", icon, full, children, onClick, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={`btn btn--${variant}`}
      style={full ? { width: "100%" } : rest.style}
      onClick={(e) => {
        haptic("impact", "light");
        onClick?.(e);
      }}
    >
      {icon ? <Icon name={icon} size={18} /> : null}
      {children}
    </button>
  );
}

export function Chip({
  active,
  children,
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...rest}
      className="chip"
      aria-pressed={!!active}
      onClick={(e) => {
        haptic("selection");
        onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}

/* ── вердикт ────────────────────────────────────────────────────── */

export type VerdictKind = "take" | "caution" | "skip" | "watch";

const VERDICT: Record<VerdictKind, string> = {
  take: "Брать",
  caution: "Осторожно",
  skip: "Не брать",
  watch: "Смотреть",
};

export function normalizeVerdict(raw: string): VerdictKind {
  const s = (raw || "").trim().toLowerCase();
  if (s.startsWith("брать") || s === "take") return "take";
  if (s.startsWith("осторожно") || s.startsWith("малая")) return "caution";
  if (s.startsWith("не брать")) return "skip";
  return "watch";
}

export function Verdict({ kind }: { kind: VerdictKind }) {
  return <span className={`verdict verdict--${kind}`}>{VERDICT[kind]}</span>;
}

export function VerdictDot({ kind }: { kind: VerdictKind }) {
  return (
    <span data-verdict={kind} style={{ display: "contents" }}>
      <span className="dot" />
    </span>
  );
}

/* ── числа ─────────────────────────────────────────────────────── */

export function Counter({
  value,
  digits = 1,
  suffix = "",
  prefix = "",
  className = "num",
}: {
  value: number;
  digits?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      prev.current = value;
      return;
    }
    const c = animate(prev.current, value, { duration: 0.6, ease: [0.22, 1, 0.36, 1], onUpdate: setShown });
    prev.current = value;
    return () => c.stop();
  }, [value]);

  return (
    <span className={className}>
      {prefix}
      {shown.toFixed(digits).replace(".", ",")}
      {suffix}
    </span>
  );
}

/* ── данные ─────────────────────────────────────────────────────── */

export function Ring({
  value,
  label,
  tone = "sage",
  size = 68,
}: {
  value: number;
  label: string;
  tone?: "sage" | "mint" | "amber" | "coral";
  size?: number;
}) {
  const c = { sage: "var(--sage-400)", mint: "var(--mint-200)", amber: "var(--caution)", coral: "var(--miss)" }[tone];
  return (
    <div
      className="ring"
      style={vars({ "--v": Math.max(0, Math.min(1, value)), "--c": c, "--size": `${size}px` })}
      role="img"
      aria-label={label}
    >
      <span>{label}</span>
    </div>
  );
}

export function ProbBar({ value, cells = 20, tone = "sage" }: { value: number; cells?: number; tone?: "sage" | "risk" }) {
  const on = Math.round(Math.max(0, Math.min(1, value)) * cells);
  return (
    <div className="probbar" aria-hidden="true">
      {Array.from({ length: cells }, (_, i) => (
        <span key={i} className="probseg" data-on={i < on ? "1" : "0"} data-tone={tone} />
      ))}
    </div>
  );
}

export function Spark({ points, w = 100, h = 28 }: { points: number[]; w?: number; h?: number }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)} ${(h - ((p - min) / span) * (h - 4) - 2).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" aria-hidden="true">
      <path d={d} stroke="var(--sage-300)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="panel panel--flat" style={{ padding: "12px 14px", display: "grid", gap: 2 }}>
      <span className="label">{label}</span>
      <span className="num" style={{ fontSize: 20 }}>
        {value}
      </span>
      {hint ? <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>{hint}</span> : null}
    </div>
  );
}

export function KeyValue({ rows }: { rows: [string, ReactNode, string?][] }) {
  return (
    <div>
      {rows.map(([k, v, color]) => (
        <div className="kv" key={k}>
          <span className="muted">{k}</span>
          <b style={color ? { color } : undefined}>{v}</b>
        </div>
      ))}
    </div>
  );
}

/* ── прогресс ───────────────────────────────────────────────────── */

export function LiquidProgress({ pct, stage }: { pct: number; stage?: string }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div role="status" aria-live="polite" style={{ display: "grid", gap: 6 }}>
      <div className="between" style={{ fontSize: "var(--fs-s)" }}>
        <span className="muted">{stage ?? ""}</span>
        <span className="num" style={{ color: "var(--mint-200)" }}>{p.toFixed(0)}%</span>
      </div>
      <div className="liquid" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p)}>
        <div className="liquid-fill" style={vars({ "--p": `${p}%` })} />
      </div>
    </div>
  );
}

export function Skeleton({ h = 14, w = "100%" }: { h?: number; w?: string | number }) {
  return <div className="skl" style={{ height: h, width: w }} />;
}

/* ── лист ───────────────────────────────────────────────────────── */

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="grabber" />
        <h2 style={{ marginBottom: "var(--sp-3)" }}>{title}</h2>
        {children}
      </div>
    </>
  );
}

/* ── нижняя навигация ───────────────────────────────────────────── */

export type TabItem = { id: string; label: string; icon: IconName };

export function TabBar({ items, active, onChange }: { items: TabItem[]; active: string; onChange: (id: string) => void }) {
  const host = useRef<HTMLElement>(null);
  const [drop, setDrop] = useState({ x: 0, w: 0 });

  useLayoutEffect(() => {
    const box = host.current;
    const el = box?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (!box || !el) return;
    const r = el.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    setDrop({ x: r.left - b.left - 6, w: r.width + 12 });
  }, [active, items]);

  return (
    <nav className="tabbar" ref={host} aria-label="Разделы">
      <span className="tabdrop" style={vars({ "--tab-x": `${drop.x}px`, "--tab-w": `${drop.w}px` })} />
      {items.map((t) => (
        <button
          key={t.id}
          data-tab={t.id}
          className="tab"
          aria-current={active === t.id ? "page" : undefined}
          onClick={() => {
            haptic("impact", "soft");
            onChange(t.id);
          }}
        >
          <Icon name={t.icon} size={20} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
