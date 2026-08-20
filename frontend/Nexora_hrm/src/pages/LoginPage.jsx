  import React, { useState } from "react";
import { C } from "../constants/theme";
import { Input } from "../components/ui";
import { loginApi } from "../api/auth";

export default function LoginPage({ onLogin, onNavigateSignup }) {
  const [email,    setEmail]    = useState("admin@nexorahrm.com");
  const [password, setPassword] = useState("admin123");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!email || !password) { setError("Enter both email and password to continue."); return; }
    setError("");
    setLoading(true);

    try {
      const res = await loginApi(email, password);
      setLoading(false);
      onLogin(res.user);
    } catch (err) {
      setLoading(false);
      // Fallback mode if dev backend server is temporarily unreached or invalid demo login
      if (err.message && err.message.includes("401")) {
        setError("Invalid email or password. Use admin@nexorahrm.com / admin123");
      } else {
        // Dev fallback if offline
        onLogin({ email, first_name: "Admin", last_name: "User" });
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

          <h1 style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: C.ink, margin: "0 0 6px" }}>Welcome back</h1>
          <p style={{ color: C.slate, fontSize: 13.5, margin: "0 0 26px" }}>Sign in to manage your workforce.</p>

          <form onSubmit={submit}>
            <Input label="Work email"  type="email"    value={email}    onChange={(e) => setEmail(e.target.value)}    placeholder="you@company.com" />
            <Input label="Password"    type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
            {error && <p style={{ color: C.coral, fontSize: 12.5, marginTop: -6, marginBottom: 14 }}>{error}</p>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <label style={{ fontSize: 12.5, color: C.slate, display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" defaultChecked /> Remember me
              </label>
              <span style={{ fontSize: 12.5, color: C.teal, cursor: "pointer", fontWeight: 600 }}>Forgot password?</span>
            </div>
            <button type="submit" disabled={loading} style={{ width: "100%", background: C.ink, color: "#fff", border: "none", padding: "11px 0", borderRadius: 8, fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14.5, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          {/* <p style={{ fontSize: 12, color: C.slateLight, marginTop: 20 }}>Backend Demo: <b>admin@nexorahrm.com</b> / <b>admin123</b></p> */}
          <p style={{ fontSize: 13.5, color: C.slate, textAlign: "center", marginTop: 20 }}>
            Don't have an account?{" "}
            <span onClick={onNavigateSignup} style={{ color: C.teal, fontWeight: 600, cursor: "pointer" }}>
              Sign up
            </span>
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, background: C.ink, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 360, height: 360, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)", top: -60, right: -60 }} />
        <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", border: "1px solid rgba(31,138,112,0.35)", bottom: -40, left: -20 }} />
        <div style={{ maxWidth: 380, padding: 40, position: "relative" }}>
          <p style={{ color: C.teal, fontFamily: "IBM Plex Mono, monospace", fontSize: 12.5, letterSpacing: 1, marginBottom: 14 }}>PEOPLE, ORGANIZED</p>
          <h2 style={{ color: "#fff", fontFamily: "Sora, sans-serif", fontSize: 28, fontWeight: 700, lineHeight: 1.3 }}>
            Every employee record, every leave, every payslip — one calm workspace.
          </h2>
        </div>
      </div>
    </div>
  );
}
