"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ZONES, type Zone } from "@/lib/chaircode/constants";

const ZONE_LABELS: Record<Zone, string> = {
  front: "Front",
  crown: "Crown",
  sideburns: "Sideburns",
  sides: "Sides",
  neckline: "Neckline",
  back: "Back",
  general: "General",
};

const WEEK_PRESETS = [2, 4, 6, 8];

type RefreshResult = {
  refresh: { overallNotes: string; zones: Record<Zone, string> };
  photoPath: string;
  photoUrl: string | null;
  originalZones: Record<Zone, string>;
};

export default function RefreshCutFlow({
  cutId,
  defaultWeeksElapsed,
  savedRedirectBase,
}: {
  cutId: string;
  defaultWeeksElapsed: number;
  savedRedirectBase: string;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<"upload" | "analyzing" | "result">("upload");
  const [weeks, setWeeks] = useState(defaultWeeksElapsed);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RefreshResult | null>(null);
  const [saving, setSaving] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function analyze() {
    if (!file) return;
    setError(null);
    setStage("analyzing");
    const formData = new FormData();
    formData.append("cutId", cutId);
    formData.append("photo", file);
    formData.append("weeksElapsed", String(weeks));

    const res = await fetch("/api/refresh-cut/analyze", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Analysis failed.");
      setStage("upload");
      return;
    }
    setResult(data);
    setStage("result");
  }

  async function saveVisit() {
    if (!result) return;
    setSaving(true);
    const res = await fetch("/api/refresh-cut/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalCutId: cutId,
        photoPath: result.photoPath,
        refreshZones: result.refresh.zones,
        overallNotes: result.refresh.overallNotes,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Save failed.");
      return;
    }
    router.push(`${savedRedirectBase}/${data.id}`);
  }

  if (stage === "analyzing") {
    return (
      <div className="analyzing">
        <div className="spinner"></div>
        <h3>Reading today&rsquo;s regrowth</h3>
        <p>Comparing against the last visit, zone by zone.</p>
      </div>
    );
  }

  if (stage === "result" && result) {
    return (
      <div>
        <div className="split">
          <div>
            <div className="photo-card">
              {previewUrl && <img src={previewUrl} alt="Today's photo" />}
              <div className="meta">
                <div className="tag">Today · {weeks}wk since last visit</div>
              </div>
            </div>
          </div>
          <div>
            <div className="stage-label">
              <div className="n">Refresh</div>
              <h2>What to do this time</h2>
            </div>
            <p style={{ color: "var(--ivory-dim)", fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
              {result.refresh.overallNotes}
            </p>
            {ZONES.map((z) => (
              <div className="zone-card" key={z}>
                <div>
                  <div className="zlabel">{ZONE_LABELS[z]}</div>
                </div>
                <div>
                  <div className="zcode" style={{ marginBottom: 6 }}>
                    LAST TIME: {result.originalZones[z]}
                  </div>
                  <div className="ztext">{result.refresh.zones[z]}</div>
                </div>
              </div>
            ))}
            {error && <p className="error-text">{error}</p>}
            <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button className="btn btn-gold" disabled={saving} onClick={saveVisit}>
                {saving ? "Saving…" : "Save this visit"}
              </button>
              <button className="btn" onClick={() => setStage("upload")}>
                Try a different photo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="eyebrow" style={{ marginBottom: 12 }}>
        Weeks since last visit
      </div>
      <div className="chip-row" style={{ marginBottom: 20 }}>
        {WEEK_PRESETS.map((w) => (
          <div key={w} className={`chip ${weeks === w ? "on" : ""}`} onClick={() => setWeeks(w)}>
            {w}wk
          </div>
        ))}
        <input
          type="number"
          min={0}
          value={weeks}
          onChange={(e) => setWeeks(Number(e.target.value))}
          style={{ width: 90 }}
        />
      </div>

      <div className="drop" onClick={() => document.getElementById("refresh-photo-input")?.click()}>
        <div className="icon">📷</div>
        <h3>{file ? file.name : "Upload today's photo"}</h3>
        <p>Taken right now, in the chair</p>
        <input
          type="file"
          id="refresh-photo-input"
          accept="image/*"
          onChange={handleFile}
          style={{ display: "none" }}
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      <button className="btn btn-gold" style={{ marginTop: 20 }} disabled={!file} onClick={analyze}>
        Analyze today&rsquo;s regrowth →
      </button>
    </div>
  );
}
