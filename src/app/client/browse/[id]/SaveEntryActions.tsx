"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FOLDER_NAMES } from "@/lib/chaircode/questions";

export default function SaveEntryActions({ portfolioEntryId }: { portfolioEntryId: string }) {
  const router = useRouter();
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(folder: string) {
    setSaving(true);
    setError(null);
    try {
      const resp = await fetch("/api/portfolio/save-as-cut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioEntryId, folder }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Save failed.");
      router.push(`/client/cuts/${data.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      {error && <p className="error-text">{error}</p>}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="btn btn-gold" onClick={() => save("Current")} disabled={saving}>
          {saving ? "Saving…" : "⚡ This is my usual"}
        </button>
        <button className="btn" onClick={() => setShowFolderPicker((v) => !v)} disabled={saving}>
          Save to folder…
        </button>
      </div>
      {showFolderPicker && (
        <div className="chip-row" style={{ marginTop: 12 }}>
          {FOLDER_NAMES.map((f) => (
            <div key={f} className="folder-chip" onClick={() => save(f)}>
              {f}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
