"use client";

import { Suspense, useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signUp, type SignUpState } from "./actions";

const initialState: SignUpState = { error: null, sent: false };

function Logo() {
  return (
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
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const [role, setRole] = useState<"client" | "barber">(
    searchParams.get("role") === "barber" ? "barber" : "client",
  );

  if (state.sent) {
    return (
      <div style={{ maxWidth: 380, margin: "40px auto", padding: "0 24px" }}>
        <Logo />
        <h1
          className="display"
          style={{ fontSize: 32, marginBottom: 16, textAlign: "center" }}
        >
          Check your email
        </h1>
        <p style={{ color: "var(--ivory-dim)", fontSize: 14, lineHeight: 1.6 }}>
          We sent a confirmation link. Click it to activate your account, then
          come back and log in.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 380, margin: "40px auto", padding: "0 24px" }}>
      <Logo />
      <h1
        className="display"
        style={{ fontSize: 40, marginBottom: 28, textAlign: "center" }}
      >
        Sign up
      </h1>

      <form action={formAction}>
        <div className="field">
          <label>I am a</label>
          <input type="hidden" name="role" value={role} />
          <div className="role-toggle" style={{ width: "fit-content" }}>
            <button
              type="button"
              className={role === "client" ? "active" : ""}
              onClick={() => setRole("client")}
            >
              Client
            </button>
            <button
              type="button"
              className={role === "barber" ? "active" : ""}
              onClick={() => setRole("barber")}
            >
              Barber
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="fullName">Full name</label>
          <input id="fullName" name="fullName" type="text" required />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            minLength={6}
            required
          />
        </div>

        {state.error && <p className="error-text">{state.error}</p>}

        <button
          type="submit"
          className="btn btn-gold"
          disabled={pending}
          style={{ width: "100%", marginTop: 8 }}
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p style={{ marginTop: 22, fontSize: 13, color: "var(--ivory-dim)" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "var(--gold-bright)" }}>
          Log in
        </Link>
      </p>
    </div>
  );
}
