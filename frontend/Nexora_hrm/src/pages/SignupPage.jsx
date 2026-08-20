import React, { useState } from "react";
import { C } from "../constants/theme";
import { Input } from "../components/ui";
import { registerApi } from "../api/auth";

export default function SignupPage({ onSignup, onNavigateLogin }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await registerApi(firstName, lastName, email, password);
      setLoading(false);
      onSignup(res.user);
    } catch (err) {
      setLoading(false);
      if (err.message) {
        setError(err.message);
      } else {
        setError("Registration failed. Please check your details.");
      }
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "Inter, sans-serif", background: C.canvas }}>
      {/* Left panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: 380, maxWidth: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 30 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: C.teal, fontFamily: "Sora, sans-serif", fontWeight: 800 }}>N</span>
            </div>
            <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 18, color: C.ink }}>Nexora HRM</span>
          </div>

          <h1 style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: C.ink, margin: "0 0 6px" }}>Create an account</h1>
          <p style={{ color: C.slate, fontSize: 13.5, margin: "0 0 26px" }}>Sign up to get started.</p>

          <form onSubmit={submit}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Input label="First Name" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
              </div>
              <div style={{ flex: 1 }}>
                <Input label="Last Name" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
              </div>
            </div>
            <Input label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password (min 8 characters)" />
            {error && <p style={{ color: C.coral, fontSize: 12.5, marginTop: -6, marginBottom: 14 }}>{error}</p>}
            
            <button type="submit" disabled={loading} style={{ width: "100%", background: C.ink, color: "#fff", border: "none", padding: "11px 0", borderRadius: 8, fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1, marginBottom: 18 }}>
              {loading ? "Signing up..." : "Sign up"}
            </button>
          </form>
          
          <p style={{ fontSize: 13.5, color: C.slate, textAlign: "center" }}>
            Already have an account?{" "}
            <span onClick={onNavigateLogin} style={{ color: C.teal, fontWeight: 600, cursor: "pointer" }}>
              Sign in
            </span>
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 360, height: 360, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)", top: -60, right: -60 }} />
        <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", border: "1px solid rgba(31,138,112,0.35)", bottom: -40, left: -20 }} />
        <div style={{ maxWidth: 380, padding: 40, position: "relative" }}>
          <p style={{ color: C.teal, fontFamily: "IBM Plex Mono, monospace", fontSize: 12.5, letterSpacing: 1, marginBottom: 14 }}>JOIN NEXORA</p>
          <h2 style={{ color: "#fff", fontFamily: "Sora, sans-serif", fontSize: 28, fontWeight: 700, lineHeight: 1.3 }}>
            Start managing your workforce better today.
          </h2>
        </div>
      </div>
    </div>
  );
}
