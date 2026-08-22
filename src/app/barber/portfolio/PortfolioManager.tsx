"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";
import { ZONES, CONTROLLED_TAGS, type Zone } from "@/lib/chaircode/constants";
import { STYLE_TEMPLATES } from "@/lib/chaircode/templates";
import { resizeImageClient } from "@/lib/chaircode/resizeImageClient";
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

type Profile = { booking_url: string | null; booth_type: string | null; city: string | null };
type Entry = {
  id: string;
  title: string;
  tags: string[];
  photo_path: string;
  verified: boolean;
  save_count: number;
  photoUrl: string | null;
};

export default function PortfolioManager({
  barberId,
  fullName,
  initialProfile,
  initialEntries,
}: {
  barberId: string;
  fullName: string | null;
  initialProfile: Profile;
  initialEntries: Entry[];
}) {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  async function saveProfile() {
    setProfileSaving(true);
    setProfileSaved(false);
    const supabase = createClient();
    await supabase.from("barbers").upsert({ id: barberId, ...profile });
    setProfileSaving(false);
    setProfileSaved(true);
  }

  async function showQr() {
    if (qrDataUrl) {
      setQrDataUrl(null);
      return;
    }
    const url = `${window.location.origin}/b/${barberId}`;
    const dataUrl = await QRCode.toDataURL(url, {
      margin: 1,
      width: 220,
      color: { dark: "#0b0b0c", light: "#ddb437" },
    });
    setQrDataUrl(dataUrl);
  }

  async function deleteEntry(id: string) {
    const supabase = createClient();
    await supabase.from("portfolio_entries").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div>
      <Topbar roleLabel="Barber" />
      <div style={{ padding: "0 24px", maxWidth: 1100, margin: "0 auto" }}>
        <h1 className="display" style={{ fontSize: 40, marginBottom: 24 }}>
          My Portfolio
        </h1>

        <div className="stage-label">
          <div className="n">Profile</div>
          <h2>Public info</h2>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <div className="field" style={{ flex: "1 1 200px" }}>
            <label htmlFor="city">City</label>
            <input
              id="city"
              type="text"
              value={profile.city ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
            />
          </div>
          <div className="field" style={{ flex: "1 1 200px" }}>
            <label htmlFor="booth_type">Booth type</label>
            <input
              id="booth_type"
              type="text"
              placeholder="Independent booth, or Shop-based — Name"
              value={profile.booth_type ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, booth_type: e.target.value }))}
            />
          </div>
          <div className="field" style={{ flex: "1 1 260px" }}>
            <label htmlFor="booking_url">Booking link</label>
            <input
              id="booking_url"
              type="text"
              placeholder="https://..."
              value={profile.booking_url ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, booking_url: e.target.value }))}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 36, flexWrap: "wrap" }}>
          <button className="btn btn-gold" onClick={saveProfile} disabled={profileSaving}>
            {profileSaving ? "Saving…" : "Save profile"}
          </button>
          {profileSaved && <span style={{ color: "var(--ivory-dim)", fontSize: 13 }}>Saved.</span>}
          <button className="btn" onClick={showQr}>
            {qrDataUrl ? "Hide" : "Show"} public profile QR
          </button>
        </div>

        {qrDataUrl && (
          <div style={{ marginBottom: 36 }}>
            <img src={qrDataUrl} alt="Public profile QR code" style={{ width: 180, height: 180, borderRadius: 4 }} />
            <p style={{ fontSize: 12.5, color: "var(--ivory-dim)", marginTop: 8 }}>
              /b/{barberId}
            </p>
          </div>
        )}

        <div className="divider-line" style={{ height: 1, background: "var(--line)", margin: "30px 0" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div className="stage-label" style={{ marginBottom: 0 }}>
            <div className="n">{entries.length}</div>
            <h2>Portfolio cuts</h2>
          </div>
          <button className="btn btn-gold" onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? "Close" : "+ Add a cut"}
          </button>
        </div>

        {showAdd && (
          <AddCutForm
            onAdded={(entry) => {
              setEntries((prev) => [entry, ...prev]);
              setShowAdd(false);
            }}
          />
        )}

        {entries.length === 0 ? (
          <div className="empty-state">
            <h3>No cuts in your portfolio yet</h3>
            <p>Add your first one so clients can find and save your work.</p>
          </div>
        ) : (
          <div className="cut-thumb-grid">
            {entries.map((e) => (
              <div key={e.id} className="cut-thumb">
                {e.photoUrl && <img src={e.photoUrl} alt={e.title} />}
                <div className="cap">
                  {e.verified && <span style={{ color: "var(--gold-bright)" }}>✓ Verified · </span>}
                  {e.title}
                  <br />
                  {e.tags.join(", ")}
                  <br />
                  Saved by {e.save_count} client{e.save_count === 1 ? "" : "s"}
                  <div style={{ marginTop: 8 }}>
                    <button className="btn btn-sm" onClick={() => deleteEntry(e.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AddCutForm({ onAdded }: { onAdded: (entry: Entry) => void }) {
  const [templateIdx, setTemplateIdx] = useState<number | null>(null);
  const [zones, setZones] = useState<Record<Zone, string>>(
    Object.fromEntries(ZONES.map((z) => [z, ""])) as Record<Zone, string>,
  );
  const [title, setTitle] = useState("");
  const [styleNotes, setStyleNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickTemplate(idx: number | null) {
    setTemplateIdx(idx);
    if (idx === null) {
      setZones(Object.fromEntries(ZONES.map((z) => [z, ""])) as Record<Zone, string>);
      if (!title) setTitle("");
    } else {
      setZones({ ...STYLE_TEMPLATES[idx].zones });
      if (!title) setTitle(STYLE_TEMPLATES[idx].name);
    }
  }

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 4 ? [...prev, tag] : prev,
    );
  }

  async function submit() {
    setError(null);
    if (!file) {
      setError("A photo is required.");
      return;
    }
    if (!title.trim()) {
      setError("A title is required.");
      return;
    }
    for (const z of ZONES) {
      if (!zones[z].trim()) {
        setError(`Fill in the ${ZONE_LABELS[z]} zone before saving.`);
        return;
      }
    }

    const verified =
      templateIdx === null ||
      ZONES.some((z) => zones[z].trim() !== STYLE_TEMPLATES[templateIdx].zones[z].trim());

    setSaving(true);
    const fd = new FormData();
    fd.append("photo", file);
    fd.append("title", title.trim());
    fd.append("zones", JSON.stringify(zones));
    fd.append("tags", JSON.stringify(tags));
    fd.append("styleNotes", styleNotes);
    fd.append("verified", String(verified));
    if (templateIdx !== null) fd.append("templateName", STYLE_TEMPLATES[templateIdx].name);

    try {
      const resp = await fetch("/api/portfolio/add", { method: "POST", body: fd });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Save failed.");
      onAdded({
        id: data.id,
        title: title.trim(),
        tags,
        photo_path: "",
        verified,
        save_count: 0,
        photoUrl: previewUrl,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 2, padding: 24, marginBottom: 30, background: "var(--panel)" }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        Start from a base style, or write your own
      </div>
      <div className="chip-row" style={{ marginBottom: 20 }}>
        {STYLE_TEMPLATES.map((t, i) => (
          <div key={t.name} className={`chip ${templateIdx === i ? "on" : ""}`} onClick={() => pickTemplate(i)}>
            {t.name}
          </div>
        ))}
        <div className={`chip ${templateIdx === null ? "on" : ""}`} onClick={() => pickTemplate(null)}>
          Start from scratch
        </div>
      </div>

      <label htmlFor="portfolio-photo-input" className="drop" style={{ padding: "28px 20px", marginBottom: 20, display: "block" }}>
        {previewUrl ? (
          <img src={previewUrl} alt="Preview" style={{ maxHeight: 160, borderRadius: 2 }} />
        ) : (
          <>
            <div style={{ fontSize: 26, marginBottom: 8 }}>📷</div>
            <h3>Upload a photo of this cut</h3>
          </>
        )}
        <input
          id="portfolio-photo-input"
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) {
              const resized = await resizeImageClient(f);
              setFile(resized);
              setPreviewUrl(URL.createObjectURL(resized));
            }
          }}
        />
      </label>

      <div className="field">
        <label htmlFor="entry-title">Title</label>
        <input id="entry-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
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

      {ZONES.map((z) => (
        <div className="field" key={z}>
          <label htmlFor={`zone-${z}`}>{ZONE_LABELS[z]}</label>
          <textarea
            id={`zone-${z}`}
            value={zones[z]}
            onChange={(e) => setZones((prev) => ({ ...prev, [z]: e.target.value }))}
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
      ))}

      <div className="field">
        <label htmlFor="style-notes">Style notes (optional)</label>
        <textarea
          id="style-notes"
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

      {error && <p className="error-text">{error}</p>}

      <button className="btn btn-gold" onClick={submit} disabled={saving}>
        {saving ? "Saving…" : "Add to portfolio"}
      </button>
    </div>
  );
}
