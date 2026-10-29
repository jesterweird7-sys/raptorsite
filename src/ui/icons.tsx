import type { ReactNode, SVGProps } from "react";

/**
 * Ночной набор иконок RAPTOR: штрих 1.5, скруглённые концы,
 * фирменная когтевая засечка на «хищных» метках.
 */

type Glyph = (k: number) => ReactNode;

const G: Record<string, Glyph> = {
  // охота: перекрестие с засечкой-когтем
  hunt: (k) => (
    <g key={k}>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2.6v3.1M12 18.3v3.1M2.6 12h3.1M18.3 12h3.1" />
      <path d="M9.4 14.2c1.2-2.6 3.1-3.9 5.2-3.9" />
    </g>
  ),
  pitch: (k) => (
    <g key={k}>
      <rect x="2.8" y="5" width="18.4" height="14" rx="2.4" />
      <path d="M12 5v14" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M2.8 9.2h3.1M2.8 14.8h3.1M21.2 9.2h-3.1M21.2 14.8h-3.1" />
    </g>
  ),
  ledger: (k) => (
    <g key={k}>
      <path d="M5.5 3.6h10.2a2.4 2.4 0 0 1 2.4 2.4v14.4H7.9a2.4 2.4 0 0 1-2.4-2.4z" />
      <path d="M9 8.4h6M9 12h6M9 15.6h3.4" />
    </g>
  ),
  wallet: (k) => (
    <g key={k}>
      <path d="M3.4 8.2c0-1.6 1.2-2.6 2.8-2.6h9.6c1.6 0 2.8 1 2.8 2.6v8.2c0 1.6-1.2 2.6-2.8 2.6H6.2c-1.6 0-2.8-1-2.8-2.6z" />
      <path d="M3.4 10.4h14.4a1.8 1.8 0 0 1 0 3.6H3.4" />
      <circle cx="15" cy="12.2" r=".9" fill="currentColor" stroke="none" />
    </g>
  ),
  user: (k) => (
    <g key={k}>
      <circle cx="12" cy="8.4" r="3.6" />
      <path d="M5 20c.9-3.6 3.6-5.4 7-5.4s6.1 1.8 7 5.4" />
    </g>
  ),
  shield: (k) => (
    <g key={k}>
      <path d="M12 3.2 5 5.8v5.6c0 4 2.8 7.3 7 9.4 4.2-2.1 7-5.4 7-9.4V5.8z" />
      <path d="M9.4 12.2l1.9 2 3.4-4" />
    </g>
  ),
  back: (k) => <path key={k} d="M14.4 5.6 8 12l6.4 6.4" />,
  chev: (k) => <path key={k} d="M9.6 5.6 16 12l-6.4 6.4" />,
  down: (k) => <path key={k} d="M5.8 9.4 12 15.6l6.2-6.2" />,
  search: (k) => (
    <g key={k}>
      <circle cx="11" cy="11" r="6.2" />
      <path d="M15.6 15.6 20.4 20.4" />
    </g>
  ),
  refresh: (k) => (
    <g key={k}>
      <path d="M19.4 12a7.4 7.4 0 1 1-2.2-5.2" />
      <path d="M18.6 4.4v3.6H15" />
    </g>
  ),
  download: (k) => (
    <g key={k}>
      <path d="M12 4.4v9.4M8.2 10.4 12 14.2l3.8-3.8" />
      <path d="M4.8 18.4h14.4" />
    </g>
  ),
  close: (k) => <path key={k} d="M6.6 6.6l10.8 10.8M17.4 6.6 6.6 17.4" />,
  filter: (k) => (
    <g key={k}>
      <path d="M4.4 6.4h15.2M7 12h10M9.6 17.6h4.8" />
    </g>
  ),
  bell: (k) => (
    <g key={k}>
      <path d="M6.6 16.4c0-1 .4-1.6 1.2-2.2.8-.7 1-1.4 1-2.6V9.6a3.2 3.2 0 0 1 6.4 0v2c0 1.2.2 1.9 1 2.6.8.6 1.2 1.2 1.2 2.2z" />
      <path d="M10.2 19.4a2 2 0 0 0 3.6 0" />
    </g>
  ),
  globe: (k) => (
    <g key={k}>
      <circle cx="12" cy="12" r="7.6" />
      <path d="M4.6 9.8h14.8M4.6 14.2h14.8M12 4.4c-2.4 2-3.4 4.6-3.4 7.6s1 5.6 3.4 7.6c2.4-2 3.4-4.6 3.4-7.6s-1-5.6-3.4-7.6z" />
    </g>
  ),
  users: (k) => (
    <g key={k}>
      <circle cx="9.4" cy="8.8" r="3.1" />
      <path d="M3.8 19.4c.7-3 2.8-4.6 5.6-4.6s4.9 1.6 5.6 4.6" />
      <path d="M16 5.8a3 3 0 0 1 0 6M17.4 15.4c2 .5 3.2 1.9 3.8 4" />
    </g>
  ),
  chart: (k) => (
    <g key={k}>
      <path d="M4.4 19.6h15.2" />
      <path d="M6.8 16.4V9.8M11 16.4V5.6M15.2 16.4v-4.8M19 16.4v-8" />
    </g>
  ),
  pulse: (k) => (
    <path key={k} d="M3.4 12.6h3.4l1.8-4.4 2.6 9 2.4-6 1.6 3h5" />
  ),
  bolt: (k) => (
    <path key={k} d="M13.4 3.4 6.6 13.2h4.2l-1.4 7.4 7.6-10.4h-4.4z" />
  ),
  clock: (k) => (
    <g key={k}>
      <circle cx="12" cy="12" r="7.6" />
      <path d="M12 7.8V12l3.2 2" />
    </g>
  ),
  calendar: (k) => (
    <g key={k}>
      <rect x="4" y="5.6" width="16" height="14.4" rx="2.4" />
      <path d="M4 10h16M8.6 4v3.2M15.4 4v3.2" />
    </g>
  ),
  check: (k) => <path key={k} d="M5.4 12.6l4.2 4.2 9-10" />,
  plus: (k) => <path key={k} d="M12 5.4v13.2M5.4 12h13.2" />,
  minus: (k) => <path key={k} d="M5.4 12h13.2" />,
  trash: (k) => (
    <g key={k}>
      <path d="M5.4 7.6h13.2M9.4 4.8h5.2" />
      <path d="M7.2 7.6l.8 11.2a1.8 1.8 0 0 0 1.8 1.6h4.4a1.8 1.8 0 0 0 1.8-1.6l.8-11.2" />
    </g>
  ),
  share: (k) => (
    <g key={k}>
      <circle cx="6.4" cy="12" r="2.6" />
      <circle cx="17.6" cy="6.4" r="2.6" />
      <circle cx="17.6" cy="17.6" r="2.6" />
      <path d="M8.8 10.8 15.2 7.6M8.8 13.2l6.4 3.2" />
    </g>
  ),
  link: (k) => (
    <g key={k}>
      <path d="M10.4 13.6a3.6 3.6 0 0 1 0-5.1l2.4-2.4a3.6 3.6 0 0 1 5.1 5.1l-1.2 1.2" />
      <path d="M13.6 10.4a3.6 3.6 0 0 1 0 5.1l-2.4 2.4a3.6 3.6 0 0 1-5.1-5.1l1.2-1.2" />
    </g>
  ),
  key: (k) => (
    <g key={k}>
      <circle cx="8.4" cy="8.4" r="3.8" />
      <path d="M11.2 11.2 19.6 19.6M16.4 16.4l2-2M14.4 14.4l2-2" />
    </g>
  ),
  db: (k) => (
    <g key={k}>
      <ellipse cx="12" cy="6.4" rx="7" ry="2.8" />
      <path d="M5 6.4v11.2c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6.4" />
      <path d="M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8" />
    </g>
  ),
  gear: (k) => (
    <g key={k}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.6v2.6M12 17.8v2.6M3.6 12h2.6M17.8 12h2.6M6.2 6.2l1.8 1.8M16 16l1.8 1.8M17.8 6.2 16 8M8 16l-1.8 1.8" />
    </g>
  ),
  alert: (k) => (
    <g key={k}>
      <path d="M12 4.4 3.8 19.2h16.4z" />
      <path d="M12 9.6v4.2" />
      <circle cx="12" cy="16.6" r=".9" fill="currentColor" stroke="none" />
    </g>
  ),
  flag: (k) => (
    <g key={k}>
      <path d="M6.2 3.8v16.4" />
      <path d="M6.2 4.6h10.4l-1.8 4 1.8 4H6.2z" />
    </g>
  ),
  log: (k) => (
    <g key={k}>
      <rect x="3.8" y="5" width="16.4" height="14" rx="2.2" />
      <path d="M7 9.4h6M7 12.4h10M7 15.4h4" />
    </g>
  ),
  coin: (k) => (
    <g key={k}>
      <ellipse cx="12" cy="7.4" rx="7" ry="2.8" />
      <path d="M5 7.4v9.2c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V7.4" />
    </g>
  ),
  stop: (k) => <rect key={k} x="6.6" y="6.6" width="10.8" height="10.8" rx="2" />,
  spark: (k) => (
    <path
      key={k}
      d="M12 3.4c.6 4.4 1.8 5.6 6.2 6.2-4.4.6-5.6 1.8-6.2 6.2-.6-4.4-1.8-5.6-6.2-6.2 4.4-.6 5.6-1.8 6.2-6.2z"
    />
  ),
};

export type IconName = keyof typeof G;

export function Icon({
  name,
  size = 22,
  strokeWidth = 1.5,
  ...rest
}: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  const glyph = G[name];
  if (!glyph) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {glyph(0)}
    </svg>
  );
}

/** Когтевая засечка — три дуги, ставится на ключевых поверхностях. */
export function ClawMark({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      viewBox="0 0 26 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
      {...rest}
    >
      <path d="M2 8.4C3.6 4.6 5.4 2.6 7.4 2.2" />
      <path d="M9.6 8.8c1.5-4 3.3-6.2 5.3-6.6" />
      <path d="M17.2 9c1.5-3.6 3.1-5.5 5-5.9" />
    </svg>
  );
}
