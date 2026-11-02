import React, { useState } from "react";
import { Input } from "../components/ui";
import { loginApi } from "../api/auth";
import { Eye, EyeOff } from "lucide-react";
import "../styles/LoginPage.css";

export default function LoginPage({ onLogin, onNavigateSignup, onNavigateForgot }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!email || !password) {
      setError("Enter both email and password to continue.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await loginApi(email, password);
      setLoading(false);
      onLogin(res.user);
    } catch (err) {
      setLoading(false);
      if (err.status === 401) {
        setError("Invalid email or password.");
      } else {
        setError("Unable to connect to the server. Please try again.");
      }
    }
  }

  return (
    <div className="login-container">
      {/* Left panel */}
      <div className="login-left-panel">
        <div className="login-box">
          <div className="login-logo-row">
            <div className="login-logo-icon">
              <span className="login-logo-letter">N</span>
            </div>
            <span className="login-brand-name">Nexora HRM</span>
          </div>

          <h1 className="login-title">Welcome back</h1>
          <p className="login-subtitle">Sign in to manage your workforce.</p>

          <form onSubmit={submit}>
            <Input
              label="Work email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="work@gmail.com"
            />

            <div className="login-password-wrapper">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Your Password"
              />

              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>

            {error && <p className="login-error-msg">{error}</p>}
            <div className="login-options-row">
              <label className="login-remember-label">
                <input type="checkbox" defaultChecked /> Remember me
              </label>
              <span onClick={onNavigateForgot} className="login-forgot-link">
                Forgot password?
              </span>
            </div>
            <button type="submit" disabled={loading} className="login-submit-btn">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="login-footer-text">
            Don't have an account?{" "}
            <span onClick={onNavigateSignup} className="login-link">
              Sign up
            </span>
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="login-right-panel">
        <div className="login-bg-circle-1" />
        <div className="login-bg-circle-2" />
        <div className="login-promo-box">
          <p className="login-promo-tag">PEOPLE, ORGANIZED</p>
          <h2 className="login-promo-title">
            Every employee record, every leave, every payslip — one calm workspace.
          </h2>
        </div>
      </div>
    </div>
  );
}
