import React, { useState } from "react";
import { Input } from "../components/ui";
import { registerApi } from "../api/auth";
import "../styles/SignupPage.css";

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
    <div className="signup-container">
      {/* Left panel */}
      <div className="signup-left-panel">
        <div className="signup-box">
          <div className="signup-logo-row">
            <div className="signup-logo-icon">
              <span className="signup-logo-letter">N</span>
            </div>
            <span className="signup-brand-name">Nexora HRM</span>
          </div>

          <h1 className="signup-title">Create an account</h1>
          <p className="signup-subtitle">Sign up to get started.</p>

          <form onSubmit={submit}>
            <div className="signup-name-row">
              <div className="signup-name-col">
                <Input
                  label="First Name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                />
              </div>
              <div className="signup-name-col">
                <Input
                  label="Last Name"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>
            <Input
              label="Work email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
            <Input
              label="Password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (min 8 characters)"
            />
            {error && <p className="signup-error-msg">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="signup-submit-btn"
            >
              {loading ? "Signing up..." : "Sign up"}
            </button>
          </form>

          <p className="signup-footer-text">
            Already have an account?{" "}
            <span onClick={onNavigateLogin} className="signup-link">
              Sign in
            </span>
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="signup-right-panel">
        <div className="signup-bg-circle-1" />
        <div className="signup-bg-circle-2" />
        <div className="signup-promo-box">
          <p className="signup-promo-tag">JOIN NEXORA</p>
          <h2 className="signup-promo-title">
            Start managing your workforce better today.
          </h2>
        </div>
      </div>
    </div>
  );
}
