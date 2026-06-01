"use client";

import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (password.trim() === "") return;

    setLoading(true);
    setErreur("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        window.location.href = "/";
        return;
      }

      const data = await response.json();
      setErreur(data.error || "Mot de passe incorrect.");
      setPassword("");
    } catch {
      setErreur("Erreur reseau. Reessaie.");
    }

    setLoading(false);
  }

  return (
    <main
      style={{
        alignItems: "center",
        background: "var(--bg-main, #1a1a16)",
        display: "flex",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 360,
          width: "100%",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              color: "var(--text-muted, #888)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.12em",
              margin: "0 0 8px",
              textTransform: "uppercase",
            }}
          >
            Acces prive
          </p>
          <h1
            style={{
              color: "var(--text-main, #f5f0e8)",
              fontSize: 28,
              fontStyle: "italic",
              fontWeight: 400,
              margin: 0,
            }}
          >
            STRATE
          </h1>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            autoFocus
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mot de passe"
            style={{
              background: "rgba(255,250,238,0.05)",
              border: "1px solid rgba(201,168,92,0.25)",
              borderRadius: 10,
              color: "var(--text-main, #f5f0e8)",
              fontSize: 15,
              outline: "none",
              padding: "12px 14px",
              width: "100%",
            }}
            type="password"
            value={password}
          />

          {erreur !== "" ? <p style={{ color: "#D85A30", fontSize: 12, margin: 0 }}>{erreur}</p> : null}

          <button
            disabled={loading || password.trim() === ""}
            style={{
              background: loading || password.trim() === "" ? "rgba(201,168,92,0.3)" : "rgba(201,168,92,0.85)",
              border: "none",
              borderRadius: 10,
              color: "#1a1a16",
              cursor: loading || password.trim() === "" ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 500,
              padding: "11px",
              transition: "background 0.15s",
            }}
            type="submit"
          >
            {loading ? "Verification..." : "Entrer"}
          </button>
        </form>
      </div>
    </main>
  );
}
