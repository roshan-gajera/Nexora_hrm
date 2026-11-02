import React, { useState } from "react";
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle, KeyRound } from "lucide-react";
import { Modal, Button } from "../ui";
import { C } from "../../constants/theme";
import { useToast } from "../../context/ToastContext";
import { changePasswordApi } from "../../api/auth";

export default function ChangePasswordModal({ onClose }) {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setError("");

    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setLoading(true);
    try {
      await changePasswordApi({
        current_password: currentPassword.trim() || undefined,
        new_password: newPassword.trim(),
      });
      toast("Password changed successfully! Your account credentials have been updated.", "success");
      onClose();
    } catch (err) {
      const msg = err.data?.old_password
        ? Array.isArray(err.data.old_password)
          ? err.data.old_password.join(" ")
          : err.data.old_password
        : err.data?.detail || err.message || "Failed to update password. Please check your credentials.";
      setError(msg);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Change Password" onClose={onClose} width={440}>
      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(31, 138, 112, 0.08)", borderRadius: 8, marginBottom: 18 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: C.teal, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
            <KeyRound size={17} />
          </div>
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: C.ink }}>
              Employee Account Security
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.slate }}>
              Update your employee login password directly in the system.
            </div>
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.coralSoft, color: C.coral, padding: "10px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, marginBottom: 14 }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Current Password (optional if not remembered) */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: C.slate, marginBottom: 5 }}>
            Current Password (Optional)
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showCurrent ? "text" : "password"}
              placeholder="Enter current password if known"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                padding: "9px 38px 9px 12px",
                borderRadius: 7,
                border: `1px solid ${C.border}`,
                outline: "none",
                color: C.ink,
              }}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.slateLight, display: "flex", alignItems: "center" }}
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <span style={{ fontSize: 11, color: C.slateLight, fontFamily: "Inter, sans-serif" }}>
            Default for new hires is <code>Employee@123</code>
          </span>
        </div>

        {/* New Password */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: C.slate, marginBottom: 5 }}>
            New Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showNew ? "text" : "password"}
              placeholder="Enter new password (min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                padding: "9px 38px 9px 12px",
                borderRadius: 7,
                border: `1px solid ${C.border}`,
                outline: "none",
                color: C.ink,
              }}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.slateLight, display: "flex", alignItems: "center" }}
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Confirm New Password */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: C.slate, marginBottom: 5 }}>
            Confirm New Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                padding: "9px 38px 9px 12px",
                borderRadius: 7,
                border: `1px solid ${C.border}`,
                outline: "none",
                color: C.ink,
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.slateLight, display: "flex", alignItems: "center" }}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {newPassword && confirmPassword && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, marginTop: 4, fontWeight: 600, color: newPassword === confirmPassword ? C.teal : C.coral }}>
              {newPassword === confirmPassword ? (
                <>
                  <CheckCircle2 size={13} /> Passwords match
                </>
              ) : (
                <>
                  <AlertCircle size={13} /> Passwords do not match
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="teal" disabled={loading || !newPassword}>
            {loading ? "Updating..." : "Change Password"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

