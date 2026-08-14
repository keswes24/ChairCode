"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ZoneRow = { key: string; label: string; original: string; text: string; flagged: boolean };

export default function CorrectionPanel({
  cutId,
  zones,
  checkoutCode,
  barberConfirmedViaCode,
  hasAfterPhoto,
}: {
  cutId: string;
  zones: ZoneRow[];
  checkoutCode: string;
  barberConfirmedViaCode: boolean;
  hasAfterPhoto: boolean;
}) {
  const supabase = createClient();
  const [rows, setRows] = useState(zones);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeConfirmed, setCodeConfirmed] = useState(barberConfirmedViaCode);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [afterPhotoUploading, setAfterPhotoUploading] = useState(false);
  const [afterPhotoDone, setAfterPhotoDone] = useState(hasAfterPhoto);

  function updateText(key: string, text: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, text } : r)));
  }

  async function toggleFlag(key: string) {
    const next = rows.map((r) => (r.key === key ? { ...r, flagged: !r.flagged } : r));
    setRows(next);
    const flags = Object.fromEntries(next.map((r) => [r.key, r.flagged]));
    await supabase.from("cuts").update({ flags }).eq("id", cutId);
  }

  async function saveCorrections() {
    setSaving(true);
    setSavedMsg(null);
    const correctedZones = Object.fromEntries(rows.map((r) => [r.key, r.text]));
    const res = await fetch("/api/inbox/correct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cutId, correctedZones }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setSavedMsg(
        data.correctionsLogged > 0
          ? `Saved — ${data.correctionsLogged} correction${data.correctionsLogged === 1 ? "" : "s"} logged to the learning pool.`
          : "Saved.",
      );
    } else {
      setSavedMsg(`Error: ${data.error}`);
    }
  }

  async function confirmCode() {
    setCodeError(null);
    if (codeInput.trim().toUpperCase() !== checkoutCode.toUpperCase()) {
      setCodeError("Code doesn't match.");
      return;
    }
    const { error } = await supabase.from("cuts").update({ barber_confirmed_via_code: true }).eq("id", cutId);
    if (!error) setCodeConfirmed(true);
  }

  async function uploadAfterPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAfterPhotoUploading(true);
    const formData = new FormData();
    formData.append("cutId", cutId);
    formData.append("photo", file);
    const res = await fetch("/api/inbox/after-photo", { method: "POST", body: formData });
    setAfterPhotoUploading(false);
    if (res.ok) {
      setAfterPhotoDone(true);
      window.location.reload();
    }
  }

  return (
    <div>
      {rows.map((z) => (
        <div className="zone-card" key={z.key}>
          <div>
            <div className="zlabel">{z.label}</div>
          </div>
          <div>
            <textarea value={z.text} onChange={(e) => updateText(z.key, e.target.value)} />
            <div className="zone-actions">
              <button className={`flag-btn ${z.flagged ? "flagged" : ""}`} onClick={() => toggleFlag(z.key)}>
                {z.flagged ? "🚩 Flagged as inaccurate" : "Flag as inaccurate"}
              </button>
            </div>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn btn-gold" disabled={saving} onClick={saveCorrections}>
          {saving ? "Saving…" : "Save corrections"}
        </button>
        {savedMsg && <span style={{ fontSize: 13, color: "var(--ivory-dim)" }}>{savedMsg}</span>}
      </div>

      <div style={{ marginTop: 32, borderTop: "1px solid var(--line)", paddingTop: 20 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          Checkout code (optional)
        </div>
        {codeConfirmed ? (
          <p style={{ fontSize: 13, color: "var(--gold-bright)" }}>✓ Confirmed via code.</p>
        ) : (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="CC-XXXXX"
              style={{ maxWidth: 160 }}
            />
            <button className="btn btn-sm" onClick={confirmCode}>
              Confirm
            </button>
            {codeError && <span style={{ fontSize: 12, color: "#e0b3a6" }}>{codeError}</span>}
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, borderTop: "1px solid var(--line)", paddingTop: 20 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          After photo
        </div>
        <p style={{ fontSize: 13, color: "var(--ivory-dim)", marginBottom: 12 }}>
          Adding this confirms you serviced this client and restarts their maintenance countdown.
        </p>
        {afterPhotoDone ? (
          <p style={{ fontSize: 13, color: "var(--gold-bright)" }}>✓ After photo added.</p>
        ) : (
          <label className="btn btn-sm" style={{ cursor: "pointer" }}>
            {afterPhotoUploading ? "Uploading…" : "Upload after photo"}
            <input
              type="file"
              accept="image/*"
              onChange={uploadAfterPhoto}
              disabled={afterPhotoUploading}
              style={{ display: "none" }}
            />
          </label>
        )}
      </div>
    </div>
  );
}
