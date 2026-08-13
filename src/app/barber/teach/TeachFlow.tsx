"use client";

import { useState } from "react";
import Link from "next/link";
import { ZONES, CONTROLLED_TAGS, type Zone } from "@/lib/chaircode/constants";
import { Topbar } from "@/components/Topbar";

const ZONE_LABELS: Record<Zone, string> = {
  front: "Front",
  crown: "Crown",
  sideburns: "Sideburns",
  sides: "Sides",
  neckline: "Neckline",
  back: "Back",
  general: "General",
};

type View = "upload" | "analyzing" | "correct" | "done";

export default function TeachFlow() {
  const [view, setView] = useState<View>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [original, setOriginal] = useState<Record<Zone, string> | null>(null);
  const [corrected, setCorrected] = useState<Record<Zone, string> | null>(null);
  const [addToPortfolio, setAddToPortfolio] = useState(true);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [styleNotes, setStyleNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ correctionsLogged: number; portfolioEntryId: string | null } | null>(
    null,
  );

  function pickFile(f: File | null) {
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function analyze() {
    if (!file) return;
    setError(null);
    setView("analyzing");
    const fd = new FormData();
    fd.append("photo", file);
    try {
      const resp = await fetch("/api/analyze-photo", { method: "POST", body: fd });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Analysis failed.");
      setOriginal(data.breakdown.zones);
      setCorrected({ ...data.breakdown.zones });
      setTitle(data.breakdown.styleName || "");
      setView("correct");
    } catch (err) {
      setError((err as Error).message);
      setView("upload");
    }
  }

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 4 ? [...prev, tag] : prev,
    );
  }

  async function save() {
    if (!original || !corrected) return;
    if (addToPortfolio && (!file || !title.trim())) {
      setError("A title is required to add this to your portfolio.");
      return;
    }
    setSaving(true);
    setError(null);
    const fd = new FormData();
    fd.append("originalZones", JSON.stringify(original));
    fd.append("correctedZones", JSON.stringify(corrected));
    fd.append("addToPortfolio", String(addToPortfolio));
    if (addToPortfolio && file) {
      fd.append("photo", file);
      fd.append("title", title.trim());
      fd.append("tags", JSON.stringify(tags));
      fd.append("styleNotes", styleNotes);
    }
    try {
      const resp = await fetch("/api/teach/save", { method: "POST", body: fd });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Save failed.");
      setResult(data);
      setView("done");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setView("upload");
    setFile(null);
    setPreviewUrl(null);
    setOriginal(null);
    setCorrected(null);
    setAddToPortfolio(true);
    setTitle("");
    setTags([]);
    setStyleNotes("");
    setError(null);
    setResult(null);
  }

  return (
    <div>
      <Topbar roleLabel="Barber" />
      <div style={{ padding: "0 24px", maxWidth: 900, margin: "0 auto" }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          Barber · Teach the AI
        </div>
        <h1 className="display" style={{ fontSize: 40, marginBottom: 20 }}>
          Correct its read, sharpen every future one
        </h1>

        {view === "upload" && (
          <>
            <p style={{ color: "var(--ivory-dim)", fontSize: 14, marginBottom: 24, maxWidth: 560, lineHeight: 1.6 }}>
              Upload a photo of your own past work — you already know the ground truth. The AI gives
              its first-pass read, you correct it, and the correction feeds every future analysis.
            </p>
            <label htmlFor="teach-photo-input" className="drop">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" style={{ maxHeight: 200, borderRadius: 2 }} />
              ) : (
                <>
                  <div style={{ fontSize: 30, marginBottom: 10 }}>📷</div>
                  <h3>Upload a photo of your work</h3>
                </>
              )}
              <input
                id="teach-photo-input"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-gold" disabled={!file} onClick={analyze} style={{ marginTop: 20 }}>
              Analyze →
            </button>
          </>
        )}

        {view === "analyzing" && (
          <div className="analyzing">
            <div className="spinner" />
            <h3 className="display" style={{ fontSize: 22 }}>
              Reading the photo
            </h3>
          </div>
        )}

        {view === "correct" && original && corrected && (
          <div className="split">
            <div>
              <div className="photo-card">
                {previewUrl && <img src={previewUrl} alt="Reference" />}
              </div>
            </div>
            <div>
              <div className="stage-label">
                <div className="n">Correct</div>
                <h2>Fix what the AI got wrong</h2>
              </div>
              {ZONES.map((z) => (
                <div className="field" key={z}>
                  <label htmlFor={`teach-zone-${z}`}>{ZONE_LABELS[z]}</label>
                  <textarea
                    id={`teach-zone-${z}`}
                    value={corrected[z]}
                    onChange={(e) => setCorrected((prev) => ({ ...prev!, [z]: e.target.value }))}
                    rows={2}
                    style={{
                      width: "100%",
                      background:
                        corrected[z].trim() !== original[z].trim() ? "rgba(198,161,91,0.08)" : "var(--panel-raised)",
                      border: "1px solid var(--line)",
                      color: "var(--ivory)",
                      fontFamily: "var(--font-inter)",
                      fontSize: 14,
                      padding: "10px 12px",
                      borderRadius: 2,
                      resize: "vertical",
                    }}
                  />
                </div>
              ))}

              <div className="divider-line" style={{ height: 1, background: "var(--line)", margin: "24px 0" }} />

              <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={addToPortfolio}
                  onChange={(e) => setAddToPortfolio(e.target.checked)}
                />
                <span style={{ fontSize: 14 }}>Also add this to my portfolio</span>
              </label>

              {addToPortfolio && (
                <>
                  <div className="field">
                    <label htmlFor="teach-title">Title</label>
                    <input id="teach-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Tags (up to 4)</label>
                    <div className="chip-row">
                      {CONTROLLED_TAGS.map((tag) => (
                        <div key={tag} className={`chip ${tags.includes(tag) ? "on" : ""}`} onClick={() => toggleTag(tag)}>
                          {tag}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="teach-notes">Style notes (optional)</label>
                    <textarea
                      id="teach-notes"
                      value={styleNotes}
                      onChange={(e) => setStyleNotes(e.target.value)}
                      rows={2}
                      style={{
                        width: "100%",
                        background: "var(--panel-raised)",
                        border: "1px solid var(--line)",
                        color: "var(--ivory)",
                        fontFamily: "var(--font-inter)",
                        fontSize: 14,
                        padding: "10px 12px",
                        borderRadius: 2,
                        resize: "vertical",
                      }}
                    />
                  </div>
                </>
              )}

              {error && <p className="error-text">{error}</p>}

              <button className="btn btn-gold" onClick={save} disabled={saving} style={{ marginTop: 8 }}>
                {saving ? "Saving…" : "Save corrections →"}
              </button>
            </div>
          </div>
        )}

        {view === "done" && result && (
          <div style={{ maxWidth: 420, margin: "60px auto", textAlign: "center" }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Saved
            </div>
            <h1 className="display" style={{ fontSize: 32, marginBottom: 16 }}>
              {result.correctionsLogged === 0
                ? "No changes needed — the AI had it right."
                : `${result.correctionsLogged} correction${result.correctionsLogged === 1 ? "" : "s"} logged.`}
            </h1>
            <p style={{ color: "var(--ivory-dim)", fontSize: 14, marginBottom: 24 }}>
              {result.correctionsLogged > 0 &&
                "Future analyses will use these as real examples of how you actually work."}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn btn-gold" onClick={reset}>
                Teach another
              </button>
              {result.portfolioEntryId && (
                <Link href="/barber/portfolio" className="btn">
                  View in portfolio
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
