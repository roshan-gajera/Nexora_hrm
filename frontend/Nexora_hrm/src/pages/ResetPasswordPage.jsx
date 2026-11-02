import React, { useState, useRef, useEffect } from "react";
import { resetPasswordApi } from "../api/auth";
import { ArrowLeft, Eye, EyeOff, ShieldCheck, KeyRound, CheckCircle2 } from "lucide-react";
import "../styles/ResetPasswordPage.css";

export default function ResetPasswordPage({ email: initialEmail, onNavigateLogin }) {
  const [email] = useState(initialEmail || "");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const inputRefs = useRef([]);

  // Auto-focus first OTP input on mount
  useEffect(() => {
    if (inputRefs.current[0]) inputRefs.current[0].focus();
  }, []);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste of full OTP
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < 6) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      if (inputRefs.current[nextIndex]) inputRefs.current[nextIndex].focus();
      return;
    }

    if (!/^\d?$/.test(value)) return; // Only digits

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const otpString = otp.join("");

  async function submit(e) {
    e.preventDefault();

    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }
    if (!password) {
      setError("Please enter a new password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await resetPasswordApi(email, otpString, password);
      setSuccess(true);
    } catch (err) {
      setError(err.data?.detail || err.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rp-container">
      {/* Left panel */}
      <div className="rp-left-panel">
        <div className="rp-box">
          {/* Logo */}
          <div className="rp-logo-row">
            <div className="rp-logo-icon">
              <span className="rp-logo-letter">N</span>
            </div>
            <span className="rp-brand-name">Nexora HRM</span>
          </div>

          {/* Back to Login */}
          <button type="button" onClick={onNavigateLogin} className="rp-back-btn">
            <ArrowLeft size={16} />
            Back to Sign in
          </button>

          {!success ? (
            <>
              <h1 className="rp-title">Reset your password</h1>
              <p className="rp-subtitle">
                Enter the 6-digit OTP sent to <strong>{email}</strong> and choose a new password.
              </p>

              <form onSubmit={submit}>
                {/* OTP Input */}
                <div className="rp-otp-section">
                  <label className="rp-label">
                    <ShieldCheck size={15} />
                    Verification Code (OTP)
                  </label>
                  <div className="rp-otp-grid">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (inputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className={`rp-otp-input ${digit ? "filled" : ""}`}
                        autoComplete="one-time-code"
                      />
                    ))}
                  </div>
                </div>

                {/* New Password */}
                <div className="rp-field">
                  <label className="rp-label">
                    <KeyRound size={15} />
                    New Password
                  </label>
                  <div className="rp-password-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="rp-input"
                    />
                    <button
                      type="button"
                      className="rp-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="rp-field">
                  <label className="rp-label">
                    <KeyRound size={15} />
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="rp-input"
                  />
                </div>

                {/* Password Strength Hints */}
                <div className="rp-strength-hints">
                  <div className={`rp-hint ${password.length >= 8 ? "pass" : ""}`}>
                    ✓ At least 8 characters
                  </div>
                  <div className={`rp-hint ${/[A-Z]/.test(password) ? "pass" : ""}`}>
                    ✓ One uppercase letter
                  </div>
                  <div className={`rp-hint ${/[0-9]/.test(password) ? "pass" : ""}`}>
                    ✓ One number
                  </div>
                  <div className={`rp-hint ${password && password === confirmPassword ? "pass" : ""}`}>
                    ✓ Passwords match
                  </div>
                </div>

                {error && <p className="rp-error-msg">{error}</p>}

                <button type="submit" disabled={loading} className="rp-submit-btn">
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            </>
          ) : (
            <div className="rp-success-box">
              <div className="rp-success-icon-wrap">
                <CheckCircle2 size={52} />
              </div>
              <h2 className="rp-success-title">Password Reset Complete!</h2>
              <p className="rp-success-text">
                Your password has been updated successfully.
                You can now sign in with your new password.
              </p>
              <button type="button" className="rp-submit-btn" onClick={onNavigateLogin}>
                Go to Sign In
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="rp-right-panel">
        <div className="rp-bg-circle-1" />
        <div className="rp-bg-circle-2" />
        <div className="rp-promo-box">
          <p className="rp-promo-tag">SECURITY FIRST</p>
          <h2 className="rp-promo-title">
            Your account is protected with OTP verification — reset securely in seconds.
          </h2>
        </div>
      </div>
    </div>
  );
}

