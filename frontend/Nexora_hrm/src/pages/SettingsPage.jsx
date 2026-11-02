import React, { useState, useEffect } from "react";
import {
  Shield, KeyRound, Mail, User, Building2, Bell, Database,
  CheckCircle2, AlertCircle, Eye, EyeOff, Save, RefreshCw,
  Lock, Server, Globe, Check, Layers
} from "lucide-react";
import { C } from "../constants/theme";
import { Card, PageHeader, Button, Avatar, Pill } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { getMeApi, updateCredentialsApi, getCurrentStoredUser } from "../api/auth";
import "../styles/SettingsPage.css";

export default function SettingsPage({ user: propUser, onUpdateUser }) {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState("credentials"); // "credentials" | "company" | "notifications" | "system"
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  // Form states for Credentials (direct DB persistence)
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("Admin");
  const [userId, setUserId] = useState(null);
  const [dateJoined, setDateJoined] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Company Preferences
  const [companySettings, setCompanySettings] = useState(() => {
    try {
      const saved = localStorage.getItem("nexora_company_settings");
      return saved ? JSON.parse(saved) : {
        companyName: "Nexora HRM Pvt Ltd",
        supportEmail: "support@nexorahrm.com",
        timezone: "IST (UTC+5:30)",
        currency: "INR (₹)",
        workWeek: "Mon – Fri",
      };
    } catch {
      return {
        companyName: "Nexora HRM Pvt Ltd",
        supportEmail: "support@nexorahrm.com",
        timezone: "IST (UTC+5:30)",
        currency: "INR (₹)",
        workWeek: "Mon – Fri",
      };
    }
  });

  // Notification Preferences
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("nexora_notification_settings");
      return saved ? JSON.parse(saved) : {
        leaveRequests: true,
        payrollReminders: true,
        candidateAlerts: true,
        attendanceAnomalies: false,
        securityLogins: true,
      };
    } catch {
      return {
        leaveRequests: true,
        payrollReminders: true,
        candidateAlerts: true,
        attendanceAnomalies: false,
        securityLogins: true,
      };
    }
  });

  // Sync user data on mount
  useEffect(() => {
    let isMounted = true;
    const initialUser = propUser || getCurrentStoredUser();

    if (initialUser) {
      setEmail(initialUser.email || "");
      setFirstName(initialUser.first_name || "");
      setLastName(initialUser.last_name || "");
      setRole(initialUser.role || "Admin");
      setUserId(initialUser.id || null);
      if (initialUser.date_joined) {
        setDateJoined(new Date(initialUser.date_joined).toLocaleDateString());
      }
    }

    // Fetch fresh user data from API
    getMeApi()
      .then((data) => {
        if (!isMounted || !data) return;
        setEmail(data.email || "");
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setRole(data.role || "Admin");
        setUserId(data.id || null);
        if (data.date_joined) {
          setDateJoined(new Date(data.date_joined).toLocaleDateString());
        }
        if (onUpdateUser) {
          onUpdateUser(data);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch latest user data from /api/auth/me/:", err);
      });

    return () => { isMounted = false; };
  }, [propUser, onUpdateUser]);

  // ── ONE-CLICK DIRECT DATABASE PERSISTENCE HANDLER ──
  const handleSaveCredentials = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setSaveMessage({ type: "error", text: "Email address cannot be empty." });
      return;
    }

    if (password) {
      if (password.length < 6) {
        setSaveMessage({ type: "error", text: "New password must be at least 6 characters long." });
        return;
      }
      if (password !== confirmPassword) {
        setSaveMessage({ type: "error", text: "New password and confirmation do not match." });
        return;
      }
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await updateCredentialsApi({
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        password: password ? password.trim() : undefined,
      });

      setPassword("");
      setConfirmPassword("");
      setSaveMessage({
        type: "success",
        text: res.message || "Credentials updated directly in database!",
      });
      toast(res.message || "Credentials updated directly in database!", "success");

      if (onUpdateUser && res.user) {
        onUpdateUser(res.user);
      }
    } catch (err) {
      const errorMsg =
        err.data?.detail ||
        (typeof err.data === "object" ? Object.values(err.data)[0]?.[0] : null) ||
        err.message ||
        "Failed to update database credentials.";
      setSaveMessage({ type: "error", text: errorMsg });
      toast(errorMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  // Save Company settings
  const handleSaveCompany = (e) => {
    e.preventDefault();
    localStorage.setItem("nexora_company_settings", JSON.stringify(companySettings));
    toast("Company & Workspace preferences saved successfully!", "success");
  };

  // Toggle Notifications
  const handleToggleNotification = (key) => {
    setNotifications((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem("nexora_notification_settings", JSON.stringify(updated));
      return updated;
    });
    toast("Notification preference updated", "success");
  };

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || email || "User Profile";

  return (
    <div className="settings-page">
      {/* Page Header */}
      <PageHeader
        title="Settings & Account"
        subtitle="Manage your database credentials, workspace configuration, and notification preferences."
        action={
          <div className="settings-header-badges">
            <div className="settings-db-status-pill">
              <span>Database Connected</span>
            </div>
            <Pill tone="blue">Role: {role.toUpperCase()}</Pill>
          </div>
        }
      />

      {/* Navigation Tabs */}
      <div className="settings-tabs">
        <button
          type="button"
          onClick={() => { setActiveTab("credentials"); setSaveMessage(null); }}
          className={`settings-tab-btn ${activeTab === "credentials" ? "active" : ""}`}
        >
          <KeyRound size={16} />
          <span>Account & Security (Direct DB)</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("company"); setSaveMessage(null); }}
          className={`settings-tab-btn ${activeTab === "company" ? "active" : ""}`}
        >
          <Building2 size={16} />
          <span>Company & Workspace</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("system"); setSaveMessage(null); }}
          className={`settings-tab-btn ${activeTab === "system" ? "active" : ""}`}
        >
          <Server size={16} />
          <span>System & Database</span>
        </button>
      </div>

      {/* Main Layout Grid */}
      <div className="settings-grid-layout">
        
        {/* Left Column: Form Content */}
        <div className="settings-main-col">

          {/* TAB 1: Direct Credentials & Security */}
          {activeTab === "credentials" && (
            <Card>
              <div className="settings-card-header">
                <div className="settings-card-header-left">
                  <div className="settings-card-header-icon teal">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h2 className="settings-card-title">Database Credentials & Profile</h2>
                    <p className="settings-card-subtitle">
                      Change your email and password directly in the database with one click.
                    </p>
                  </div>
                </div>
              </div>

              {/* Direct Database Notice */}
              {/* <div className="settings-db-notice">
                <Database size={20} color={C.teal} style={{ flexShrink: 0 }} />
                <div className="settings-db-notice-text">
                  <strong>Direct Database Synchronization:</strong> 
                </div>
              </div> */}

              {/* User Profile Banner */}
              <div className="settings-profile-banner">
                {/* <div className="settings-profile-banner-left">
                  <div className="settings-profile-avatar-wrap">
                    <Avatar name={displayName} size={54} />
                  </div>
                  <div className="settings-profile-info">
                    <div className="settings-profile-name">{displayName}</div>
                    <div className="settings-profile-email">{email}</div>
                    <div className="settings-profile-badges">
                      <Pill tone="teal">{role.toUpperCase()}</Pill>
                      {userId && (
                        <span style={{ fontSize: 11, color: C.slateLight, fontFamily: "IBM Plex Mono, monospace" }}>
                          ID: #{userId}
                        </span>
                      )}
                    </div>
                  </div>
                </div> */}

                {dateJoined && (
                  <div style={{ fontSize: 12, color: C.slate, textAlign: "right" }}>
                    Joined: <strong>{dateJoined}</strong>
                  </div>
                )}
              </div>

              {/* Credential Update Form */}
              <form onSubmit={handleSaveCredentials}>
                {/* Names */}
                <div className="settings-form-row">
                  <div>
                    <label className="settings-label">First Name</label>
                    <div className="settings-input-wrapper">
                      <User size={16} className="settings-input-icon" />
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        className="settings-input has-left-icon"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="settings-label">Last Name</label>
                    <div className="settings-input-wrapper">
                      <User size={16} className="settings-input-icon" />
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        className="settings-input has-left-icon"
                      />
                    </div>
                  </div>
                </div>

                {/* Email Address */}
                <div className="settings-input-group">
                  <label className="settings-label">
                    Primary Email Address (Admin Login) *
                  </label>
                  <div className="settings-input-wrapper">
                    <Mail size={16} className="settings-input-icon" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@nexorahrm.com"
                      className="settings-input has-left-icon"
                    />
                  </div>
                </div>

                {/* Password Fields */}
                <div className="settings-form-row" style={{ marginTop: 20 }}>
                  <div>
                    <label className="settings-label">
                      New Password (Optional)
                    </label>
                    <div className="settings-input-wrapper">
                      <Lock size={16} className="settings-input-icon" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Leave blank to keep unchanged"
                        className="settings-input has-left-icon has-right-icon"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="settings-password-toggle-btn"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <Eye size={17} /> : <EyeOff size={17} />}
                      </button>
                    </div>
                    <div className="settings-field-hint">Min 6 characters. Enter a new password to reset it.</div>
                  </div>

                  <div>
                    <label className="settings-label">
                      Confirm New Password
                    </label>
                    <div className="settings-input-wrapper">
                      <Lock size={16} className="settings-input-icon" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        disabled={!password}
                        className="settings-input has-left-icon has-right-icon"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={!password}
                        className="settings-password-toggle-btn"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <Eye size={17} /> : <EyeOff size={17} />}
                      </button>
                    </div>
                    {password && confirmPassword && (
                      <div className="settings-field-hint" style={{ color: password === confirmPassword ? C.teal : C.coral }}>
                        {password === confirmPassword ? "✓ Passwords match" : "✕ Passwords do not match"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Save Feedback Status */}
                {saveMessage && (
                  <div
                    className={`settings-status-msg ${saveMessage.type}`}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      marginBottom: 16,
                      background: saveMessage.type === "success" ? C.tealSoft : C.coralSoft,
                      border: `1px solid ${saveMessage.type === "success" ? C.teal : C.coral}`,
                    }}
                  >
                    {saveMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{saveMessage.text}</span>
                  </div>
                )}

                {/* Action Row */}
                <div className="settings-action-bar">

                  <button
                    type="submit"
                    disabled={saving}
                    className="settings-save-btn"
                  >
                    {saving ? (
                      <>
                        <RefreshCw size={16} className="sub-spinner" />
                        <span>Saving to Database...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save & Update Database</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </Card>
          )}

          {/* TAB 2: Company & Workspace */}
          {activeTab === "company" && (
            <Card>
              <div className="settings-card-header">
                <div className="settings-card-header-left">
                  <div className="settings-card-header-icon blue">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h2 className="settings-card-title">Company & Workspace Preferences</h2>
                    <p className="settings-card-subtitle">
                      Organization branding, working hours, and localization settings.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveCompany}>
                <div className="settings-input-group">
                  <label className="settings-label">Company Legal Name</label>
                  <input
                    type="text"
                    value={companySettings.companyName}
                    onChange={(e) => setCompanySettings({ ...companySettings, companyName: e.target.value })}
                    className="settings-input"
                  />
                </div>

                <div className="settings-input-group">
                  <label className="settings-label">Official Support / HR Email</label>
                  <input
                    type="email"
                    value={companySettings.supportEmail}
                    onChange={(e) => setCompanySettings({ ...companySettings, supportEmail: e.target.value })}
                    className="settings-input"
                  />
                </div>

                <div className="settings-form-row">
                  <div>
                    <label className="settings-label">Time Zone</label>
                    <select
                      value={companySettings.timezone}
                      onChange={(e) => setCompanySettings({ ...companySettings, timezone: e.target.value })}
                      className="settings-input"
                    >
                      <option>IST (UTC+5:30)</option>
                      <option>PST (UTC-8:00)</option>
                      <option>EST (UTC-5:00)</option>
                      <option>GMT (UTC+0:00)</option>
                      <option>SGT (UTC+8:00)</option>
                    </select>
                  </div>

                  <div>
                    <label className="settings-label">Currency Symbol</label>
                    <select
                      value={companySettings.currency}
                      onChange={(e) => setCompanySettings({ ...companySettings, currency: e.target.value })}
                      className="settings-input"
                    >
                      <option>INR (₹)</option>
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                      <option>GBP (£)</option>
                    </select>
                  </div>
                </div>

                <div className="settings-input-group">
                  <label className="settings-label">Standard Work Schedule</label>
                  <select
                    value={companySettings.workWeek}
                    onChange={(e) => setCompanySettings({ ...companySettings, workWeek: e.target.value })}
                    className="settings-input"
                  >
                    <option>Mon – Fri (Standard 5-day week)</option>
                    <option>Mon – Sat (Standard 6-day week)</option>
                    <option>Rotational Shifts (Custom schedule)</option>
                  </select>
                </div>

                <div className="settings-action-bar">
                  <div style={{ fontSize: 12, color: C.slate }}>
                    Applies globally to payroll calculations and report timestamps.
                  </div>
                  <button type="submit" className="settings-save-btn">
                    <Save size={16} /> Save Company Settings
                  </button>
                </div>
              </form>
            </Card>
          )}


          {/* TAB 4: System & Database Details */}
          {activeTab === "system" && (
            <Card>
              <div className="settings-card-header">
                <div className="settings-card-header-left">
                  <div className="settings-card-header-icon teal">
                    <Server size={20} />
                  </div>
                  <div>
                    <h2 className="settings-card-title">System & Database Architecture</h2>
                    <p className="settings-card-subtitle">
                      Technical environment, database connections, and platform specifications.
                    </p>
                  </div>
                </div>
              </div>

              <div className="settings-info-list" style={{ display: "flex", flexDirection: "column" }}>
                <div className="settings-info-item">
                  <span className="settings-info-label">Application Platform</span>
                  <span className="settings-info-val">Nexora HRM v2.4 (Enterprise Edition)</span>
                </div>
                <div className="settings-info-item">
                  <span className="settings-info-label">Backend Engine</span>
                  <span className="settings-info-val">Django 5.0 REST Framework</span>
                </div>
                <div className="settings-info-item">
                  <span className="settings-info-label">Database Persistence</span>
                  <span className="settings-info-val">PostgreSQL / Django ORM Engine</span>
                </div>
                <div className="settings-info-item">
                  <span className="settings-info-label">Database Table for Users</span>
                  <span className="settings-info-val">accounts_user</span>
                </div>
                <div className="settings-info-item">
                  <span className="settings-info-label">Database Table for Employees</span>
                  <span className="settings-info-val">hrm_employee</span>
                </div>
                <div className="settings-info-item">
                  <span className="settings-info-label">Authentication Token Protocol</span>
                  <span className="settings-info-val">SimpleJWT (Bearer Authentication)</span>
                </div>
                <div className="settings-info-item">
                  <span className="settings-info-label">Local API Host</span>
                  <span className="settings-info-val">http://127.0.0.1:8000/api</span>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Side Column: Security Overview & Quick Status */}
        <div className="settings-side-col">
          {/* Security & DB Status Card */}
          <div className="settings-info-card">
            <div className="settings-info-header">
              <Shield size={18} color={C.teal} />
              <span>Security & Database Status</span>
            </div>

            <div className="settings-info-item">
              <span className="settings-info-label">Database Status</span>
              <span className="settings-info-val" style={{ color: C.teal, display: "flex", alignItems: "center", gap: 5 }}>
                Connected
              </span>
            </div>

            <div className="settings-info-item">
              <span className="settings-info-label">Current Authenticated User</span>
              <span className="settings-info-val">{email}</span>
            </div>

            <div className="settings-info-item">
              <span className="settings-info-label">User Role</span>
              <span className="settings-info-val">{role.toUpperCase()}</span>
            </div>

            <div className="settings-info-item">
              <span className="settings-info-label">One-Click Direct Database Sync</span>
              <span className="settings-info-val" style={{ color: C.teal }}>Active & Ready</span>
            </div>

            <div className="settings-info-item">
              <span className="settings-info-label">Token Rotation</span>
              <span className="settings-info-val">Automatic</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
