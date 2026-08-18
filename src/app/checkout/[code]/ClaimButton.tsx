"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClaimButton({ checkoutCode }: { checkoutCode: string }) {
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setClaiming(true);
    setError(null);
    const res = await fetch("/api/checkout/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: checkoutCode }),
    });
    const data = await res.json();
    setClaiming(false);
    if (!res.ok) {
      setError(data.error || "Couldn't claim this cut.");
      return;
    }
    router.push(`/barber/inbox/${data.id}`);
  }

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding: 18,
      }}
    >
      <p style={{ fontSize: 13.5, color: "var(--ivory-dim)", marginBottom: 14, lineHeight: 1.6 }}>
        Is this your client? Add them to your inbox to correct the breakdown, confirm the
        checkout code, and log the after-photo once you&rsquo;re done.
      </p>
      {error && <p className="error-text">{error}</p>}
      <button className="btn btn-gold" disabled={claiming} onClick={claim}>
        {claiming ? "Adding…" : "This is my client — add to my inbox"}
      </button>
    </div>
  );
}
