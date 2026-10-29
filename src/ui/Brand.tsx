import logo from "../assets/raptor-glass.jpg";

/** Заставка и пустое состояние: диск с лого без лишних украшений. */
export function BrandMark({ size = 120 }: { size?: number }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "-28%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(111,163,122,.28), transparent 62%)",
          filter: "blur(16px)",
        }}
      />
      <img
        src={logo}
        alt="Раптор"
        width={size}
        height={size}
        style={{
          position: "relative",
          borderRadius: "50%",
          display: "block",
          boxShadow: "0 22px 46px -28px rgba(0,0,0,.95), inset 0 0 0 1px rgba(196,227,203,.2)",
        }}
      />
    </div>
  );
}

export function Splash() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        display: "grid",
        placeItems: "center",
        alignContent: "center",
        gap: "var(--sp-5)",
        background: "var(--void-0)",
      }}
    >
      <BrandMark size={132} />
      <span className="brand" style={{ justifySelf: "center" }}>
        РАПТОР
      </span>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div
      className="panel panel--flat"
      style={{ padding: "var(--sp-6) var(--sp-4)", display: "grid", justifyItems: "center", gap: "var(--sp-3)", textAlign: "center" }}
    >
      <BrandMark size={72} />
      <h2 style={{ fontSize: "var(--fs-h2)" }}>{title}</h2>
      {hint ? <span className="muted" style={{ maxWidth: 260, fontSize: "var(--fs-s)" }}>{hint}</span> : null}
    </div>
  );
}
