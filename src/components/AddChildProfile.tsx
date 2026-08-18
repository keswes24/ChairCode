"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CHILD_AGE_RANGES } from "@/lib/chaircode/constants";

export default function AddChildProfile() {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [ageRange, setAgeRange] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("child_profiles").insert({
      parent_id: user.id,
      name: name.trim() || null,
      age_range: ageRange || null,
    });
    setSaving(false);
    setOpen(false);
    setName("");
    setAgeRange("");
    router.refresh();
  }

  if (!open) {
    return (
      <div className="folder-chip" onClick={() => setOpen(true)}>
        + Add a profile
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        padding: 14,
        display: "flex",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <input
        type="text"
        placeholder="First name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ width: 160 }}
      />
      <div className="chip-row">
        {CHILD_AGE_RANGES.map((r) => (
          <div
            key={r}
            className={`chip ${ageRange === r ? "on" : ""}`}
            onClick={() => setAgeRange(ageRange === r ? "" : r)}
          >
            {r}
          </div>
        ))}
      </div>
      <button className="btn btn-sm btn-gold" disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Save"}
      </button>
      <button className="btn btn-sm" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </div>
  );
}
