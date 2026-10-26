import React, { useState, useEffect, useRef } from "react";
import {
  Clock, LogIn, LogOut, Calendar, CheckCircle2, AlertCircle,
  Home, Building, Timer, ArrowUpRight, ShieldCheck, Sparkles, RefreshCw
} from "lucide-react";
import { C } from "../constants/theme";
import { Card, PageHeader, Pill, Table, Button, EmptyState } from "../components/ui";
import { statusTone } from "../utils/helpers";
import { useToast } from "../context/ToastContext";
import {
  fetchMyAttendance,
  fetchTodayAttendance,
  punchIn,
  punchOut,
} from "../api/employeePortalApi";

/** Helper to parse time string like "09:30 AM" or "09:30:00" into a Date object for today */
function parseTodayTime(timeStr) {
  if (!timeStr || timeStr === "--") return null;
  try {
    const today = new Date();
    const parts = timeStr.trim().split(" ");
    const timeParts = parts[0].split(":");
    let hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1] || "0", 10);
    const modifier = parts[1] ? parts[1].toUpperCase() : null;

    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, 0);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** Format elapsed seconds into HH:MM:SS */
function formatDuration(totalSeconds) {
  if (totalSeconds <= 0 || isNaN(totalSeconds)) return "00h 00m 00s";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

/** Calculate duration between check-in and check-out strings */
function calculateHoursWorked(checkInStr, checkOutStr) {
  const start = parseTodayTime(checkInStr);
  const end = parseTodayTime(checkOutStr);
  if (!start || !end || end < start) return "--";
  const diffMs = end - start;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
}

export default function EmpAttendancePage({ user }) {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [todayStatus, setTodayStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState("All");
  const [workMode, setWorkMode] = useState("Present"); // "Present" (Office) or "WFH"

  // Live real-time clock
  const [currentTime, setCurrentTime] = useState(new Date());
  // Live elapsed working seconds
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Update live clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial data
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [todayRes, historyRes] = await Promise.all([
        fetchTodayAttendance(),
        fetchMyAttendance(),
      ]);
      setTodayStatus(todayRes);
      const items = Array.isArray(historyRes) ? historyRes : historyRes?.results || [];
      setHistory(items);
    } catch (err) {
      console.warn("Failed to load attendance:", err);
      toast?.("Failed to load attendance records", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute live elapsed duration timer when punched in
  useEffect(() => {
    if (!todayStatus?.has_punched_in || todayStatus?.has_punched_out) {
      if (todayStatus?.has_punched_in && todayStatus?.has_punched_out) {
        const start = parseTodayTime(todayStatus.check_in);
        const end = parseTodayTime(todayStatus.check_out);
        if (start && end && end >= start) {
          setElapsedSeconds(Math.floor((end - start) / 1000));
        }
      }
      return;
    }

    const checkInDate = parseTodayTime(todayStatus.check_in);
    if (!checkInDate) return;

    const updateElapsed = () => {
      const now = new Date();
      const diffSec = Math.max(0, Math.floor((now - checkInDate) / 1000));
      setElapsedSeconds(diffSec);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [todayStatus]);

  // Handle Punch In
  const handlePunchIn = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await punchIn({ status: workMode });
      toast?.(res.detail || "Punched in successfully!", "success");
      await loadData(true);
    } catch (err) {
      const msg = err?.data?.detail || err?.message || "Punch in failed.";
      toast?.(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Punch Out
  const handlePunchOut = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await punchOut();
      toast?.(res.detail || "Punched out successfully!", "success");
      await loadData(true);
    } catch (err) {
      const msg = err?.data?.detail || err?.message || "Punch out failed.";
      toast?.(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Stats calculation
  const presentDays = history.filter((a) => a.status === "Present").length;
  const lateDays = history.filter((a) => a.status === "Late").length;
  const wfhDays = history.filter((a) => a.status === "WFH").length;
  const totalDays = history.length;

  const filteredHistory = filter === "All"
    ? history
    : history.filter((a) => a.status === filter);

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const hasPunchedIn = !!todayStatus?.has_punched_in;
  const hasPunchedOut = !!todayStatus?.has_punched_out;
  const checkInTime = todayStatus?.check_in || "--";
  const checkOutTime = todayStatus?.check_out || "--";
  const todayRecordStatus = todayStatus?.status || (hasPunchedIn ? "Present" : "Not Punched In");

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: C.slate, fontFamily: "Inter, sans-serif" }}>
        <RefreshCw size={24} className="spin" style={{ marginBottom: 12, color: C.teal }} />
        <div>Loading your attendance dashboard...</div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      {/* Page Header */}
      <PageHeader
        title="My Attendance"
        subtitle="Record your daily punch in & out, monitor your working hours, and review attendance history."
        action={
          <Button variant="outline" icon={RefreshCw} small onClick={() => loadData(false)}>
            Refresh Data
          </Button>
        }
      />

      {/* ── HERO PUNCH WIDGET CARD ── */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.ink} 0%, #1A2E50 60%, #15243E 100%)`,
          borderRadius: 16,
          padding: "30px 34px",
          color: "#fff",
          marginBottom: 24,
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 12px 36px rgba(20,33,61,0.18)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Ambient Decorative Lighting */}
        <div style={{ position: "absolute", top: -70, right: -60, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(31,138,112,0.22) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: 30, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(42,92,154,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Top Row: Shift Info & Live Clock Badge */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldCheck size={18} color={C.teal} />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>
                Shift: <strong style={{ color: "#fff" }}>{todayStatus?.shift || "Standard (09:00 AM – 06:00 PM)"}</strong>
              </span>
            </div>

            {/* Live pulsating badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", padding: "5px 14px", borderRadius: 999 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: hasPunchedIn && !hasPunchedOut ? "#10B981" : C.amber, boxShadow: `0 0 8px ${hasPunchedIn && !hasPunchedOut ? "#10B981" : C.amber}` }} />
              <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12, color: "#fff", fontWeight: 600 }}>
                {formattedTime}
              </span>
            </div>
          </div>

          {/* Main Hero Content Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, alignItems: "center" }}>
            
            {/* Left: Clock & Punch Info */}
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                {formattedDate}
              </div>
              <div style={{ fontFamily: "Sora, sans-serif", fontSize: 34, fontWeight: 800, color: "#fff", letterSpacing: -0.5, marginBottom: 14 }}>
                {hasPunchedIn && !hasPunchedOut ? "You are on duty" : hasPunchedOut ? "Day Completed" : "Ready to start?"}
              </div>

              {/* Mode Selection (Before Punching In) */}
              {!hasPunchedIn && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 8, fontWeight: 500 }}>
                    Select Today's Work Mode:
                  </div>
                  <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.08)", padding: 4, borderRadius: 10, gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setWorkMode("Present")}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 14px", borderRadius: 8, border: "none",
                        background: workMode === "Present" ? C.teal : "transparent",
                        color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Building size={14} /> In-Office
                    </button>
                    <button
                      type="button"
                      onClick={() => setWorkMode("WFH")}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 14px", borderRadius: 8, border: "none",
                        background: workMode === "WFH" ? C.blue : "transparent",
                        color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Home size={14} /> Work From Home (WFH)
                    </button>
                  </div>
                </div>
              )}

              {/* Today's Punch Stats Chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 16px", minWidth: 120 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 0.5 }}>Punch In</div>
                  <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 16, fontWeight: 600, color: checkInTime !== "--" ? "#34D399" : "#fff", marginTop: 2 }}>
                    {checkInTime}
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 16px", minWidth: 120 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 0.5 }}>Punch Out</div>
                  <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 16, fontWeight: 600, color: checkOutTime !== "--" ? "#F87171" : "rgba(255,255,255,0.5)", marginTop: 2 }}>
                    {checkOutTime}
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 16px", minWidth: 140 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 0.5 }}>Working Time</div>
                  <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 16, fontWeight: 600, color: C.amberSoft, marginTop: 2 }}>
                    {formatDuration(elapsedSeconds)}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Big Interactive Punch Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: 22, borderRadius: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
                  Today's Status:
                </span>
                <span style={{
                  background: hasPunchedIn ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.1)",
                  color: hasPunchedIn ? "#34D399" : "rgba(255,255,255,0.7)",
                  fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700,
                  padding: "4px 12px", borderRadius: 999, border: `1px solid ${hasPunchedIn ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.15)"}`
                }}>
                  {todayRecordStatus}
                </span>
              </div>

              <div style={{ display: "flex", gap: 12, width: "100%", flexWrap: "wrap" }}>
                {/* Punch In Button */}
                <button
                  type="button"
                  onClick={handlePunchIn}
                  disabled={hasPunchedIn || submitting}
                  style={{
                    flex: 1,
                    minWidth: 140,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    padding: "14px 20px",
                    borderRadius: 10,
                    border: "none",
                    background: hasPunchedIn
                      ? "rgba(255,255,255,0.08)"
                      : `linear-gradient(135deg, ${C.teal} 0%, #15735d 100%)`,
                    color: hasPunchedIn ? "rgba(255,255,255,0.4)" : "#fff",
                    fontFamily: "Sora, sans-serif",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: hasPunchedIn ? "not-allowed" : "pointer",
                    boxShadow: hasPunchedIn ? "none" : "0 6px 20px rgba(31,138,112,0.35)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <LogIn size={18} />
                  {hasPunchedIn ? `In at ${checkInTime}` : "Punch In"}
                </button>

                {/* Punch Out Button */}
                <button
                  type="button"
                  onClick={handlePunchOut}
                  disabled={!hasPunchedIn || hasPunchedOut || submitting}
                  style={{
                    flex: 1,
                    minWidth: 140,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    padding: "14px 20px",
                    borderRadius: 10,
                    border: "none",
                    background: !hasPunchedIn || hasPunchedOut
                      ? "rgba(255,255,255,0.08)"
                      : `linear-gradient(135deg, ${C.coral} 0%, #a83624 100%)`,
                    color: !hasPunchedIn || hasPunchedOut ? "rgba(255,255,255,0.4)" : "#fff",
                    fontFamily: "Sora, sans-serif",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: !hasPunchedIn || hasPunchedOut ? "not-allowed" : "pointer",
                    boxShadow: !hasPunchedIn || hasPunchedOut ? "none" : "0 6px 20px rgba(196,67,47,0.35)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <LogOut size={18} />
                  {hasPunchedOut ? `Out at ${checkOutTime}` : "Punch Out"}
                </button>
              </div>

              {/* Status hint text */}
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
                {!hasPunchedIn
                  ? "Click Punch In when you arrive or begin work for the day."
                  : !hasPunchedOut
                  ? "Timer is active. Remember to Punch Out before leaving."
                  : "✓ Attendance completed for today. Great job!"}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── ATTENDANCE METRICS CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Card accent={C.teal}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, color: C.slate, fontWeight: 600 }}>Present Days</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: C.tealSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={15} color={C.teal} />
            </div>
          </div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 24, fontWeight: 700, color: C.ink }}>
            {presentDays}
          </div>
          <div style={{ fontSize: 11.5, color: C.slateLight, marginTop: 4 }}>Standard in-office logs</div>
        </Card>

        <Card accent={C.blue}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, color: C.slate, fontWeight: 600 }}>WFH Days</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: C.blueSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Home size={15} color={C.blue} />
            </div>
          </div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 24, fontWeight: 700, color: C.ink }}>
            {wfhDays}
          </div>
          <div style={{ fontSize: 11.5, color: C.slateLight, marginTop: 4 }}>Remote work check-ins</div>
        </Card>

        <Card accent={C.amber}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, color: C.slate, fontWeight: 600 }}>Late Arrivals</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: C.amberSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertCircle size={15} color={C.amber} />
            </div>
          </div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 24, fontWeight: 700, color: C.ink }}>
            {lateDays}
          </div>
          <div style={{ fontSize: 11.5, color: C.slateLight, marginTop: 4 }}>After shift grace period</div>
        </Card>

        <Card accent={C.ink}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, color: C.slate, fontWeight: 600 }}>Total Logged</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "#EEF1F5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Timer size={15} color={C.ink} />
            </div>
          </div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 24, fontWeight: 700, color: C.ink }}>
            {totalDays}
          </div>
          <div style={{ fontSize: 11.5, color: C.slateLight, marginTop: 4 }}>Recorded work entries</div>
        </Card>
      </div>

      {/* ── ATTENDANCE LOG TABLE ── */}
      <Card style={{ padding: 0 }}>
        <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontFamily: "Sora, sans-serif", fontSize: 16, fontWeight: 700, color: C.ink, margin: "0 0 2px" }}>
              My Attendance Records
            </h3>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.slate, margin: 0 }}>
              Chronological check-in and check-out logs
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["All", "Present", "WFH", "Late", "Absent"].map((s) => (
              <div key={s} onClick={() => setFilter(s)} style={{ cursor: "pointer" }}>
                <Pill tone={s === filter ? statusTone(s === "All" ? "Active" : s) : "slate"}>
                  {s}
                </Pill>
              </div>
            ))}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div style={{ padding: 36 }}>
            <EmptyState text={`No attendance records found for "${filter}".`} />
          </div>
        ) : (
          <Table
            columns={["Date", "Status", "Check-In", "Check-Out", "Duration", "Remarks"]}
            rows={filteredHistory}
            renderRow={(a, idx) => {
              const dur = calculateHoursWorked(a.checkIn, a.checkOut);
              return (
                <tr key={a.id || idx} className="hoverable" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: C.ink }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Calendar size={14} color={C.slateLight} />
                      {a.date}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <Pill tone={statusTone(a.status)}>{a.status}</Pill>
                  </td>
                  <td style={{ padding: "12px 16px", color: C.ink, fontFamily: "IBM Plex Mono, monospace", fontSize: 13 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Clock size={13} color={C.teal} />
                      {a.checkIn || "--"}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", color: C.slate, fontFamily: "IBM Plex Mono, monospace", fontSize: 13 }}>
                    {a.checkOut || "--"}
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: dur !== "--" ? C.teal : C.slateLight, fontFamily: "IBM Plex Mono, monospace" }}>
                    {dur}
                  </td>
                  <td style={{ padding: "12px 16px", color: C.slateLight, fontSize: 12.5 }}>
                    {a.status === "WFH" ? "Remote Work" : a.status === "Late" ? "Grace time exceeded" : "Regular workday"}
                  </td>
                </tr>
              );
            }}
          />
        )}
      </Card>
    </div>
  );
}
