"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LookUpByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    router.push(`/checkout/${encodeURIComponent(code.trim())}`);
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 10, marginBottom: 30 }}>
      <input
        type="text"
        placeholder="Enter a client's checkout code (e.g. CC-4F7K2)"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        style={{ maxWidth: 280 }}
      />
      <button type="submit" className="btn btn-sm">
        Look up
      </button>
    </form>
  );
}
