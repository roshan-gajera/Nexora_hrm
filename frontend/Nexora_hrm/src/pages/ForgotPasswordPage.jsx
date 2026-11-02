import React, { useState } from "react";
import { Input } from "../components/ui";
import { forgotPasswordApi } from "../api/auth";
import { Mail, ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import "../styles/ForgotPasswordPage.css";

export default function ForgotPasswordPage({ onNavigateLogin, onNavigateReset }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }

    // Email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      setError("Please enter a valid email address (e.g. name@company.com).");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await forgotPasswordApi(trimmed);
      setSent(true);
    } catch (err) {
      const msg = err.data?.detail
        || (Array.isArray(err.data?.email) ? err.data.email[0] : null)
        || err.message
        || "Failed to send OTP. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fp-container">
      {/* Left panel */}
      <div className="fp-left-panel">
        <div className="fp-box">
          {/* Logo */}
          <div className="fp-logo-row">
            <div className="fp-logo-icon">
              <span className="fp-logo-letter">N</span>
            </div>
            <span className="fp-brand-name">Nexora HRM</span>
          </div>

          {/* Back to Login */}
          <button type="button" onClick={onNavigateLogin} className="fp-back-btn">
            <ArrowLeft size={16} />
            Back to Sign in
          </button>

          {!sent ? (
            <>
              <h1 className="fp-title">Forgot password?</h1>
              <p className="fp-subtitle">
                No worries! Enter the email address linked to your account and we'll
                send you a 6-digit OTP to reset your password.
              </p>

              <form onSubmit={submit}>
                <Input
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="work@gmail.com"
                />

                {error && <p className="fp-error-msg">{error}</p>}

                <button type="submit" disabled={loading} className="fp-submit-btn">
                  <Send size={16} />
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>
              </form>
            </>
          ) : (
            <div className="fp-success-box">
              <div className="fp-success-icon-wrap">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="fp-success-title">OTP Sent!</h2>
              <p className="fp-success-text">
                We've sent a 6-digit verification code to{" "}
                <strong>{email}</strong>. Please check your inbox
                (and spam folder).
              </p>
              <p className="fp-success-hint">
                The code expires in <strong>10 minutes</strong>.
              </p>

              <button
                type="button"
                className="fp-submit-btn"
                onClick={() => onNavigateReset(email)}
              >
                Enter OTP & Reset Password
              </button>

              <button
                type="button"
                className="fp-resend-btn"
                onClick={() => { setSent(false); setError(""); }}
              >
                Didn't receive it? Send again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="fp-right-panel">
        <div className="fp-bg-circle-1" />
        <div className="fp-bg-circle-2" />
        <div className="fp-promo-box">
          <p className="fp-promo-tag">ACCOUNT RECOVERY</p>
          <h2 className="fp-promo-title">
            Secure password reset — verified with a one-time code sent to your email.
          </h2>
        </div>
      </div>
    </div>
  );
}

