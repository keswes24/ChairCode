"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { embeddedOne } from "@/lib/chaircode/embeddedOne";

type Barber = { id: string; full_name: string; city: string | null };

type Feedback = {
  rating: number;
  notes: string;
  wants_rebook: boolean;
  submitted_at: string;
} | null;

export default function BookingPanel({
  cutId,
  initialBookedBarberId,
  initialBookedBarberName,
  initialMarkedBooked,
  initialPhotoConsent,
  hasAfterPhoto,
  initialFeedback,
}: {
  cutId: string;
  initialBookedBarberId: string | null;
  initialBookedBarberName: string | null;
  initialMarkedBooked: boolean;
  initialPhotoConsent: boolean;
  hasAfterPhoto: boolean;
  initialFeedback: Feedback;
}) {
  const supabase = createClient();
  const [bookedBarberId, setBookedBarberId] = useState(initialBookedBarberId);
  const [bookedBarberName, setBookedBarberName] = useState(initialBookedBarberName);
  const [markedBooked, setMarkedBooked] = useState(initialMarkedBooked);
  const [photoConsent, setPhotoConsent] = useState(initialPhotoConsent);
  const [feedback, setFeedback] = useState(initialFeedback);
  const [picking, setPicking] = useState(false);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loadingBarbers, setLoadingBarbers] = useState(false);
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState("");
  const [wantsRebook, setWantsRebook] = useState(true);
  const [savingFeedback, setSavingFeedback] = useState(false);

  async function openPicker() {
    setPicking(true);
    setLoadingBarbers(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, barbers!inner(city)")
      .eq("role", "barber");
    setBarbers(
      (data ?? []).map((b) => ({
        id: b.id,
        full_name: b.full_name,
        city: embeddedOne(b.barbers as { city: string | null } | { city: string | null }[] | null)?.city ?? null,
      })),
    );
    setLoadingBarbers(false);
  }

  async function sendToBarber(barber: Barber) {
    const { error } = await supabase
      .from("cuts")
      .update({ booked_barber_id: barber.id })
      .eq("id", cutId);
    if (!error) {
      setBookedBarberId(barber.id);
      setBookedBarberName(barber.full_name);
      setPicking(false);
    }
  }

  async function markBooked() {
    const { error } = await supabase
      .from("cuts")
      .update({ client_marked_booked: true })
      .eq("id", cutId);
    if (!error) setMarkedBooked(true);
  }

  async function toggleConsent() {
    const next = !photoConsent;
    const { error } = await supabase
      .from("cuts")
      .update({ photo_consent: next })
      .eq("id", cutId);
    if (!error) setPhotoConsent(next);
  }

  async function submitFeedback() {
    setSavingFeedback(true);
    const value = { rating, notes, wants_rebook: wantsRebook, submitted_at: new Date().toISOString() };
    const { error } = await supabase.from("cuts").update({ feedback: value }).eq("id", cutId);
    setSavingFeedback(false);
    if (!error) setFeedback(value);
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        Booking
      </div>

      {!bookedBarberId && !picking && (
        <button className="btn" onClick={openPicker}>
          Send to a barber
        </button>
      )}

      {picking && (
        <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16 }}>
          {loadingBarbers ? (
            <p style={{ color: "var(--ivory-dim)", fontSize: 13 }}>Loading barbers…</p>
          ) : barbers.length === 0 ? (
            <p style={{ color: "var(--ivory-dim)", fontSize: 13 }}>No barbers on ChairCode yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {barbers.map((b) => (
                <button
                  key={b.id}
                  className="btn btn-sm"
                  style={{ justifyContent: "flex-start" }}
                  onClick={() => sendToBarber(b)}
                >
                  {b.full_name}
                  {b.city ? ` · ${b.city}` : ""}
                </button>
              ))}
            </div>
          )}
          <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => setPicking(false)}>
            Cancel
          </button>
        </div>
      )}

      {bookedBarberId && !markedBooked && (
        <div>
          <p style={{ fontSize: 13, color: "var(--ivory-dim)", marginBottom: 10 }}>
            Sent to <b style={{ color: "var(--gold-bright)" }}>{bookedBarberName}</b>. Your name stays
            private to them until you confirm below.
          </p>
          <button className="btn btn-gold" onClick={markBooked}>
            I&rsquo;ve booked this
          </button>
        </div>
      )}

      {bookedBarberId && markedBooked && (
        <p style={{ fontSize: 13, color: "var(--gold-bright)" }}>
          ✓ Sent to {bookedBarberName} · Booked — they can now see your name.
        </p>
      )}

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18, cursor: "pointer" }}>
        <input type="checkbox" checked={photoConsent} onChange={toggleConsent} style={{ width: "auto" }} />
        <span style={{ fontSize: 13, color: "var(--ivory-dim)" }}>
          Let this barber use my photo in their portfolio if they use my cut
        </span>
      </label>

      {hasAfterPhoto && !feedback && (
        <div style={{ marginTop: 24, borderTop: "1px solid var(--line)", paddingTop: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            How was it?
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="chip"
                onClick={() => setRating(n)}
                style={
                  rating >= n
                    ? { background: "var(--gold)", borderColor: "var(--gold)", color: "#1a1508" }
                    : undefined
                }
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            placeholder="Any notes? (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: "100%",
              minHeight: 70,
              background: "var(--panel-raised)",
              border: "1px solid var(--line)",
              color: "var(--ivory)",
              borderRadius: "var(--radius)",
              padding: 12,
              marginBottom: 12,
            }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={wantsRebook}
              onChange={(e) => setWantsRebook(e.target.checked)}
              style={{ width: "auto" }}
            />
            <span style={{ fontSize: 13, color: "var(--ivory-dim)" }}>
              Save this look and make it easy to rebook
            </span>
          </label>
          <button className="btn btn-gold" disabled={savingFeedback} onClick={submitFeedback}>
            {savingFeedback ? "Saving…" : "Submit feedback"}
          </button>
        </div>
      )}

      {feedback && (
        <p style={{ marginTop: 20, fontSize: 13, color: "var(--ivory-dim)" }}>
          Thanks for the feedback — {feedback.rating}★
          {feedback.wants_rebook ? ", saved for easy rebooking." : "."}
        </p>
      )}
    </div>
  );
}
