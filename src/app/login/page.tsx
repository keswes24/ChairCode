"use client";

import { useActionState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import { signIn, type AuthState } from "./actions";

const initialState: AuthState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <AuthLayout>
      <h1 className="display" style={{ fontSize: 30, marginBottom: 6 }}>
        Log in
      </h1>
      <p className="eyebrow" style={{ marginBottom: 30 }}>
        Zone system · Cut translation
      </p>

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

      <p
        style={{
          marginTop: 22,
          paddingTop: 20,
          borderTop: "1px solid var(--line)",
          fontSize: 13.5,
          color: "var(--ivory-dim)",
        }}
      >
        No account?{" "}
        <Link href="/signup" style={{ color: "var(--gold-bright)" }}>
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
