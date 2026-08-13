import Link from "next/link";
import { signOut } from "@/app/login/actions";

const NAV_LINKS: Record<string, { href: string; label: string }[]> = {
  Client: [
    { href: "/client/new-cut", label: "New Cut" },
    { href: "/client/folders", label: "Folders" },
    { href: "/client/browse", label: "Browse" },
  ],
  Barber: [
    { href: "/barber/portfolio", label: "My Portfolio" },
    { href: "/barber/teach", label: "Teach the AI" },
  ],
};

export function Topbar({ roleLabel }: { roleLabel: string }) {
  const links = NAV_LINKS[roleLabel] ?? [];
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
        <Link href={links[0]?.href ?? "/"} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <div className="display" style={{ fontSize: 28 }}>
            Chair<span style={{ color: "var(--gold)" }}>Code</span>
          </div>
        </Link>
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
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} style={{ fontSize: 13, color: "var(--ivory-dim)" }}>
            {l.label}
          </Link>
        ))}
        <form action={signOut}>
          <button type="submit" className="btn btn-sm">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
