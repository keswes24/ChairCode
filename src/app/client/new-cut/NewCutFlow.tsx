"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { ZONES, type Zone } from "@/lib/chaircode/constants";
import { QUESTIONS, FOLDER_NAMES } from "@/lib/chaircode/questions";
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

const ASSIGNABLE_ZONES = ZONES.filter((z) => z !== "general");

type PhotoEntry = {
  file: File;
  previewUrl: string;
  zones: Zone[];
};

type AnalyzedPhoto = {
  index: number;
  path: string;
  url: string | null;
  zones: Zone[];
};

type Breakdown = {
  styleName: string;
  filtered: boolean;
  zones: Record<Zone, string>;
  products: string[];
  maintenanceWeeksMin: number;
  maintenanceWeeksMax: number;
  suggestedTags: string[];
};

type View = "upload" | "analyzing" | "breakdown" | "questionnaire" | "saved";

export default function NewCutFlow() {
  const router = useRouter();
  const [view, setView] = useState<View>("upload");
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [analyzedPhotos, setAnalyzedPhotos] = useState<AnalyzedPhoto[]>([]);
  const [description, setDescription] = useState("");
  const [folder, setFolder] = useState<string>(FOLDER_NAMES[0]);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [answeredZones, setAnsweredZones] = useState<Set<Zone>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ checkoutCode: string; qrDataUrl: string } | null>(null);

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const newEntries: PhotoEntry[] = Array.from(fileList).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      zones: [],
    }));
    setPhotos((prev) => [...prev, ...newEntries]);
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleZoneForPhoto(photoIdx: number, zone: Zone) {
    setPhotos((prev) =>
      prev.map((p, i) => {
        if (i === photoIdx) {
          const has = p.zones.includes(zone);
          return { ...p, zones: has ? p.zones.filter((z) => z !== zone) : [...p.zones, zone] };
        }
        // auto-unclaim from every other photo
        return { ...p, zones: p.zones.filter((z) => z !== zone) };
      }),
    );
  }

  async function analyze() {
    if (photos.length === 0) return;
    setError(null);
    setView("analyzing");

    const fd = new FormData();
    photos.forEach((p, i) => {
      fd.append(`photo_${i}`, p.file);
      fd.append(`zones_${i}`, JSON.stringify(p.zones));
    });
    if (description.trim()) fd.append("description", description.trim());

    try {
      const resp = await fetch("/api/new-cut/analyze", { method: "POST", body: fd });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Analysis failed.");
      setBreakdown(data.breakdown);
      setAnalyzedPhotos(data.photos);
      setView("breakdown");
    } catch (err) {
      setError((err as Error).message);
      setView("upload");
    }
  }

  function toggleAnswer(qid: string, opt: string, type: "single" | "multi") {
    setAnswers((prev) => {
      const next = { ...prev };
      if (type === "single") {
        next[qid] = opt;
      } else {
        const cur = (prev[qid] as string[]) || [];
        next[qid] = cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt];
      }
      const q = QUESTIONS.find((q) => q.id === qid)!;
      const val = next[qid];
      const hasValue = Array.isArray(val) ? val.length > 0 : !!val;
      if (hasValue) {
        setAnsweredZones((prevZones) => new Set(prevZones).add(q.zone));
      }
      return next;
    });
  }

  function finalZoneText(zone: Zone): string {
    if (!breakdown) return "";
    const base = breakdown.zones[zone];
    const relevant = QUESTIONS.filter((q) => q.zone === zone && answers[q.id]);
    if (relevant.length === 0) return base;
    const notes = relevant
      .map((q) => {
        const v = answers[q.id];
        return Array.isArray(v) ? v.join(", ") : v;
      })
      .join(" · ");
    return `${base}  ‹client confirmed: ${notes.toLowerCase()}›`;
  }

  async function saveCut() {
    if (!breakdown) return;
    setSaving(true);
    setError(null);
    try {
      const resp = await fetch("/api/new-cut/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: analyzedPhotos,
          breakdown: {
            ...breakdown,
            zones: Object.fromEntries(ZONES.map((z) => [z, finalZoneText(z)])),
          },
          styleNotes: description,
          folder,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Save failed.");

      const qrDataUrl = await QRCode.toDataURL(data.checkoutCode, {
        margin: 1,
        width: 220,
        color: { dark: "#0b0b0c", light: "#e4c578" },
      });
      setSaved({ checkoutCode: data.checkoutCode, qrDataUrl });
      setView("saved");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Topbar roleLabel="Client" />
      <div style={{ padding: "0 24px", maxWidth: 1100, margin: "0 auto" }}>
        {view === "upload" && (
          <UploadStage
            photos={photos}
            description={description}
            folder={folder}
            error={error}
            onAddFiles={addFiles}
            onRemovePhoto={removePhoto}
            onToggleZone={toggleZoneForPhoto}
            onDescriptionChange={setDescription}
            onFolderChange={setFolder}
            onAnalyze={analyze}
          />
        )}

        {view === "analyzing" && (
          <div className="analyzing">
            <div className="spinner" />
            <h3 className="display" style={{ fontSize: 22 }}>
              Reading the photo, zone by zone
            </h3>
            <p style={{ color: "var(--ivory-dim)", fontSize: 13, maxWidth: 340 }}>
              Front, crown, sides, back, neckline — checking each before writing the breakdown.
            </p>
          </div>
        )}

        {view === "breakdown" && breakdown && (
          <BreakdownStage
            photos={photos}
            breakdown={breakdown}
            onContinue={() => setView("questionnaire")}
            onBack={() => setView("upload")}
          />
        )}

        {view === "questionnaire" && breakdown && (
          <QuestionnaireStage
            photos={photos}
            breakdown={breakdown}
            answers={answers}
            answeredZones={answeredZones}
            onToggleAnswer={toggleAnswer}
            onBack={() => setView("breakdown")}
            onFinish={saveCut}
            finalZoneText={finalZoneText}
            saving={saving}
            error={error}
          />
        )}

        {view === "saved" && saved && (
          <SavedStage
            checkoutCode={saved.checkoutCode}
            qrDataUrl={saved.qrDataUrl}
            onDone={() => router.push(`/client/folders/${encodeURIComponent(folder)}`)}
          />
        )}
      </div>
    </div>
  );
}

function UploadStage(props: {
  photos: PhotoEntry[];
  description: string;
  folder: string;
  error: string | null;
  onAddFiles: (files: FileList | null) => void;
  onRemovePhoto: (idx: number) => void;
  onToggleZone: (photoIdx: number, zone: Zone) => void;
  onDescriptionChange: (v: string) => void;
  onFolderChange: (v: string) => void;
  onAnalyze: () => void;
}) {
  const {
    photos,
    description,
    folder,
    error,
    onAddFiles,
    onRemovePhoto,
    onToggleZone,
    onDescriptionChange,
    onFolderChange,
    onAnalyze,
  } = props;

  return (
    <div>
      <div style={{ padding: "10px 0 8px", marginBottom: 30 }}>
        <div className="eyebrow">Client · New Cut</div>
        <h1 className="display" style={{ fontSize: 44, margin: "12px 0" }}>
          Show us the cut. We&apos;ll say it <span style={{ color: "var(--gold)" }}>right.</span>
        </h1>
        <p style={{ color: "var(--ivory-dim)", fontSize: 15, maxWidth: 520, lineHeight: 1.55 }}>
          Upload a reference photo. ChairCode reads it zone by zone and turns it into the precise
          terminology your barber actually uses — guard numbers, blends, and all.
        </p>
      </div>

      <div className="eyebrow" style={{ marginBottom: 10 }}>
        Save into
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 26 }}>
        {FOLDER_NAMES.map((f) => (
          <div
            key={f}
            className={`folder-chip ${folder === f ? "selected" : ""}`}
            onClick={() => onFolderChange(f)}
          >
            {f}
          </div>
        ))}
      </div>

      <label htmlFor="photo-input" className="drop">
        <div style={{ fontSize: 30, marginBottom: 10 }}>📷</div>
        <h3>Drop photos, or tap to choose</h3>
        <p>JPG or PNG · upload more than one if different photos show different angles</p>
        <input
          id="photo-input"
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => onAddFiles(e.target.files)}
        />
      </label>

      {photos.length > 0 && (
        <div style={{ marginTop: 22 }}>
          {photos.map((p, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 16,
                alignItems: "flex-start",
                padding: "16px 0",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <img
                src={p.previewUrl}
                alt={`Reference ${i + 1}`}
                style={{
                  width: 84,
                  aspectRatio: "4/5",
                  objectFit: "cover",
                  borderRadius: 2,
                  border: "1px solid var(--line)",
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  {i === 0 ? "Primary photo" : `Photo ${i + 1}`}
                </div>
                {i === 0 ? (
                  <div style={{ fontSize: 12.5, color: "var(--ivory-dim)" }}>
                    Covers any zone not claimed by another photo below.
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 12, color: "var(--ivory-dim)", marginBottom: 8 }}>
                      Which zones does this photo show?
                    </div>
                    <div className="chip-row">
                      {ASSIGNABLE_ZONES.map((z) => (
                        <div
                          key={z}
                          className={`chip ${p.zones.includes(z) ? "on" : ""}`}
                          onClick={() => onToggleZone(i, z)}
                        >
                          {ZONE_LABELS[z]}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button className="btn btn-sm" onClick={() => onRemovePhoto(i)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="field" style={{ marginTop: 26 }}>
        <label htmlFor="description">Describe it in your own words (optional)</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={3}
          style={{
            width: "100%",
            background: "var(--panel-raised)",
            border: "1px solid var(--line)",
            color: "var(--ivory)",
            fontFamily: "var(--font-inter)",
            fontSize: 14,
            padding: "12px 14px",
            borderRadius: 2,
            resize: "vertical",
          }}
          placeholder="e.g. grown-out, more of a flow than a fade — not much clipper work"
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      <button
        className="btn btn-gold"
        disabled={photos.length === 0}
        onClick={onAnalyze}
        style={{ marginTop: 8 }}
      >
        Analyze this cut →
      </button>
    </div>
  );
}

function BreakdownStage(props: {
  photos: PhotoEntry[];
  breakdown: Breakdown;
  onContinue: () => void;
  onBack: () => void;
}) {
  const { photos, breakdown, onContinue, onBack } = props;
  return (
    <div className="split">
      <div>
        <div className="photo-card">
          <img src={photos[0]?.previewUrl} alt="Reference" />
          <div className="meta">
            <div className="name">{breakdown.styleName}</div>
            <div className="tag">AI first read · unconfirmed</div>
          </div>
        </div>
        {breakdown.filtered && (
          <div className="filter-flag">
            ⚠ This reference looks styled or professionally lit — the real-life result may vary.
          </div>
        )}
      </div>
      <div>
        <div className="stage-label">
          <div className="n">1 / 3</div>
          <h2>First read</h2>
        </div>
        <p style={{ color: "var(--ivory-dim)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          Here&apos;s our best guess from the photo alone. Confirm the details next so nothing gets
          lost in translation.
        </p>
        {ZONES.filter((z) => z !== "general").map((z) => (
          <div className="zone-card" key={z}>
            <div>
              <div className="zlabel">{ZONE_LABELS[z]}</div>
            </div>
            <div className="ztext">{breakdown.zones[z]}</div>
          </div>
        ))}
        <div style={{ marginTop: 26, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn btn-gold" onClick={onContinue}>
            Looks right — refine details →
          </button>
          <button className="btn" onClick={onBack}>
            Try different photos
          </button>
        </div>
      </div>
    </div>
  );
}

function QuestionnaireStage(props: {
  photos: PhotoEntry[];
  breakdown: Breakdown;
  answers: Record<string, string | string[]>;
  answeredZones: Set<Zone>;
  onToggleAnswer: (qid: string, opt: string, type: "single" | "multi") => void;
  onBack: () => void;
  onFinish: () => void;
  finalZoneText: (zone: Zone) => string;
  saving: boolean;
  error: string | null;
}) {
  const {
    photos,
    breakdown,
    answers,
    answeredZones,
    onToggleAnswer,
    onBack,
    onFinish,
    finalZoneText,
    saving,
    error,
  } = props;

  const answeredCount = Object.values(answers).filter((v) =>
    Array.isArray(v) ? v.length > 0 : !!v,
  ).length;
  const pct = Math.round((answeredCount / QUESTIONS.length) * 100);
  const zoneGroups = new Map<Zone, typeof QUESTIONS>();
  QUESTIONS.forEach((q) => {
    zoneGroups.set(q.zone, [...(zoneGroups.get(q.zone) || []), q]);
  });

  return (
    <div className="split">
      <div>
        <div className="photo-card">
          <img src={photos[0]?.previewUrl} alt="Reference" />
          <div className="meta">
            <div className="name">{breakdown.styleName}</div>
            <div className="tag">
              {answeredCount} of {QUESTIONS.length} confirmed
            </div>
          </div>
        </div>
      </div>
      <div>
        <div className="stage-label">
          <div className="n">2 / 3</div>
          <h2>A few quick taps</h2>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>

        {ZONES.filter((z) => zoneGroups.has(z)).map((z) => (
          <div className="q-block" key={z}>
            <div className="q-zone-tag">{ZONE_LABELS[z]}</div>
            {zoneGroups.get(z)!.map((q) => (
              <div key={q.id} style={{ marginBottom: 16 }}>
                <div className="q-text">{q.text}</div>
                <div className="chip-row">
                  {q.options.map((opt) => {
                    const v = answers[q.id];
                    const on = Array.isArray(v) ? v.includes(opt) : v === opt;
                    return (
                      <div
                        key={opt}
                        className={`chip ${on ? "on" : ""}`}
                        onClick={() => onToggleAnswer(q.id, opt, q.type)}
                      >
                        {opt}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}

        <div className="divider-line" style={{ height: 1, background: "var(--line)", margin: "30px 0" }} />
        <div className="stage-label">
          <div className="n">3 / 3</div>
          <h2>Full breakdown</h2>
        </div>
        {ZONES.map((z) => (
          <div className="zone-card" key={z}>
            <div>
              <div className="zlabel">{ZONE_LABELS[z]}</div>
            </div>
            <div className="ztext">{finalZoneText(z)}</div>
          </div>
        ))}

        {error && <p className="error-text">{error}</p>}

        <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn btn-gold" onClick={onFinish} disabled={saving}>
            {saving ? "Saving…" : "Save this cut →"}
          </button>
          <button className="btn" onClick={onBack} disabled={saving}>
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}

function SavedStage(props: { checkoutCode: string; qrDataUrl: string; onDone: () => void }) {
  const { checkoutCode, qrDataUrl, onDone } = props;
  return (
    <div style={{ maxWidth: 420, margin: "60px auto", textAlign: "center" }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        Saved
      </div>
      <h1 className="display" style={{ fontSize: 36, marginBottom: 20 }}>
        Show this at checkout
      </h1>
      <img
        src={qrDataUrl}
        alt="Checkout QR code"
        style={{ borderRadius: 4, marginBottom: 16, width: 220, height: 220 }}
      />
      <div className="mono" style={{ fontSize: 22, color: "var(--gold-bright)", marginBottom: 24 }}>
        {checkoutCode}
      </div>
      <button className="btn btn-gold" onClick={onDone}>
        Done
      </button>
    </div>
  );
}
