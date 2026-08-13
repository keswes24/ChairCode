import { signOut } from "@/app/login/actions";

export function Topbar({ roleLabel }: { roleLabel: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "22px 24px",
        borderBottom: "1px solid var(--line)",
        marginBottom: 36,
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <div className="display" style={{ fontSize: 28 }}>
          Chair<span style={{ color: "var(--gold)" }}>Code</span>
        </div>
        <div
          className="mono"
          style={{
            fontSize: 10,
            color: "var(--ivory-dim)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {roleLabel}
        </div>
      </div>
      <form action={signOut}>
        <button type="submit" className="btn btn-sm">
          Sign out
        </button>
      </form>
    </div>
  );
}
