"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn, type AuthState } from "./actions";

const initialState: AuthState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <div
      style={{
        maxWidth: 380,
        margin: "40px auto",
        padding: "0 24px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <Image
          src="/chaircode-logo.webp"
          alt="ChairCode"
          width={180}
          height={180}
          priority
          style={{ width: 180, height: 180, margin: "0 auto" }}
        />
      </div>
      <h1
        className="display"
        style={{ fontSize: 40, marginBottom: 28, textAlign: "center" }}
      >
        Log in
      </h1>

      <form action={formAction}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required />
        </div>

        {state.error && <p className="error-text">{state.error}</p>}

        <button
          type="submit"
          className="btn btn-gold"
          disabled={pending}
          style={{ width: "100%", marginTop: 8 }}
        >
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p style={{ marginTop: 22, fontSize: 13, color: "var(--ivory-dim)" }}>
        No account?{" "}
        <Link href="/signup" style={{ color: "var(--gold-bright)" }}>
          Sign up
        </Link>
      </p>
    </div>
  );
}
