import React, { useState, useEffect } from "react";
import {
  Clock, LogIn, LogOut, Calendar, CheckCircle2, AlertCircle,
  Home, Building, Timer, ShieldCheck, RefreshCw
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
import "../styles/EmpAttendancePage.css";

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

  // Calculate elapsed working seconds if punched in and NOT punched out
  useEffect(() => {
    if (!todayStatus) return;

    const checkIn = todayStatus.check_in || todayStatus.checkIn;
    const checkOut = todayStatus.check_out || todayStatus.checkOut;

    if (checkIn && checkIn !== "--" && (!checkOut || checkOut === "--")) {
      const inDate = parseTodayTime(checkIn);
      if (inDate) {
        const updateElapsed = () => {
          const now = new Date();
          const diffSec = Math.floor((now - inDate) / 1000);
          setElapsedSeconds(diffSec > 0 ? diffSec : 0);
        };
        updateElapsed();
        const interval = setInterval(updateElapsed, 1000);
        return () => clearInterval(interval);
      }
    } else if (checkIn && checkOut && checkIn !== "--" && checkOut !== "--") {
      const inDate = parseTodayTime(checkIn);
      const outDate = parseTodayTime(checkOut);
      if (inDate && outDate) {
        const totalSec = Math.floor((outDate - inDate) / 1000);
        setElapsedSeconds(totalSec > 0 ? totalSec : 0);
      }
    } else {
      setElapsedSeconds(0);
    }
  }, [todayStatus]);

  // Handle Punch In
  const handlePunchIn = async () => {
    setSubmitting(true);
    try {
      const res = await punchIn({ status: workMode === "WFH" ? "WFH" : undefined });
      toast?.(res.detail || res.message || "Punched in successfully!", "success");
      await loadData(true);
    } catch (err) {
      toast?.(err.message || "Failed to punch in.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Punch Out
  const handlePunchOut = async () => {
    setSubmitting(true);
    try {
      const res = await punchOut();
      toast?.(res.detail || res.message || "Punched out successfully!", "success");
      await loadData(true);
    } catch (err) {
      toast?.(err.message || "Failed to punch out.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Status flags
  const checkInTime = todayStatus?.check_in || todayStatus?.checkIn || "--";
  const checkOutTime = todayStatus?.check_out || todayStatus?.checkOut || "--";
  const hasPunchedIn = checkInTime !== "--";
  const hasPunchedOut = checkOutTime !== "--";
  const todayRecordStatus = todayStatus?.status || (hasPunchedIn ? "In Progress" : "Not Started");

  // Summary counts for employee history
  const presentDays = history.filter((a) => a.status === "Present").length;
  const wfhDays = history.filter((a) => a.status === "WFH").length;
  const lateDays = history.filter((a) => a.status === "Late").length;
  const totalDays = history.length;

  const filteredHistory = filter === "All"
    ? history
    : history.filter((a) => a.status === filter);

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.slate }}>
        Loading your attendance records...
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
      <div className="emp-att-hero">
        <div className="emp-att-ambient-1" />
        <div className="emp-att-ambient-2" />

        <div className="emp-att-hero-content">
          {/* Top Row: Shift Info & Live Clock Badge */}
          <div className="emp-att-top-row">
            <div className="emp-att-shift-info">
              <ShieldCheck size={18} color={C.teal} />
              <span>
                Shift: <strong>{todayStatus?.shift || "Standard (09:00 AM – 06:00 PM)"}</strong>
              </span>
            </div>

            {/* Live pulsating badge */}
            <div className="emp-att-clock-badge">
              <span className="emp-att-clock-time">
                {formattedTime}
              </span>
            </div>
          </div>

          {/* Main Hero Content Grid */}
          <div className="emp-att-hero-grid">
            
            {/* Left: Clock & Punch Info */}
            <div className="emp-att-hero-left">
              <div className="emp-att-date-label">
                {formattedDate}
              </div>
              <div className="emp-att-hero-title">
                {hasPunchedIn && !hasPunchedOut ? "You are on duty" : hasPunchedOut ? "Day Completed" : "Ready to start?"}
              </div>

              {/* Mode Selection (Before Punching In) */}
              {!hasPunchedIn && (
                <div className="emp-att-mode-select">
                  <div className="emp-att-mode-label">
                    Select Today's Work Mode:
                  </div>
                  <div className="emp-att-mode-btn-group">
                    <button
                      type="button"
                      onClick={() => setWorkMode("Present")}
                      className={`emp-att-mode-btn ${workMode === "Present" ? "active-present" : ""}`}
                    >
                      <Building size={14} /> In-Office
                    </button>
                    <button
                      type="button"
                      onClick={() => setWorkMode("WFH")}
                      className={`emp-att-mode-btn ${workMode === "WFH" ? "active-wfh" : ""}`}
                    >
                      <Home size={14} /> Work From Home (WFH)
                    </button>
                  </div>
                </div>
              )}

              {/* Today's Punch Stats Chips */}
              <div className="emp-att-chips-row">
                <div className="emp-att-chip">
                  <div className="emp-att-chip-label">Punch In</div>
                  <div
                    className="emp-att-chip-time"
                    style={{ color: checkInTime !== "--" ? "#34D399" : "#fff" }}
                  >
                    {checkInTime}
                  </div>
                </div>

                <div className="emp-att-chip">
                  <div className="emp-att-chip-label">Punch Out</div>
                  <div
                    className="emp-att-chip-time"
                    style={{ color: checkOutTime !== "--" ? "#F87171" : "rgba(255,255,255,0.5)" }}
                  >
                    {checkOutTime}
                  </div>
                </div>

                <div className="emp-att-chip" style={{ minWidth: 140 }}>
                  <div className="emp-att-chip-label">Working Time</div>
                  <div className="emp-att-chip-time" style={{ color: C.amberSoft }}>
                    {formatDuration(elapsedSeconds)}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Big Interactive Punch Buttons */}
            <div className="emp-att-hero-action-box">
              <div className="emp-att-status-row">
                <span className="emp-att-status-label">
                  Today's Status:
                </span>
                <span className={`emp-att-status-pill ${hasPunchedIn ? "active" : "idle"}`}>
                  {todayRecordStatus}
                </span>
              </div>

              <div className="emp-att-btn-row">
                {/* Punch In Button */}
                <button
                  type="button"
                  onClick={handlePunchIn}
                  disabled={hasPunchedIn || submitting}
                  className="emp-att-punch-btn in"
                >
                  <LogIn size={18} />
                  {hasPunchedIn ? `In at ${checkInTime}` : "Punch In"}
                </button>

                {/* Punch Out Button */}
                <button
                  type="button"
                  onClick={handlePunchOut}
                  disabled={!hasPunchedIn || hasPunchedOut || submitting}
                  className="emp-att-punch-btn out"
                >
                  <LogOut size={18} />
                  {hasPunchedOut ? `Out at ${checkOutTime}` : "Punch Out"}
                </button>
              </div>

              {/* Status hint text */}
              <div className="emp-att-hint">
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
      <div className="emp-att-metrics-grid">
        <Card accent={C.teal}>
          <div className="emp-att-metric-header">
            <span className="emp-att-metric-label">Present Days</span>
            <div className="emp-att-metric-icon" style={{ background: C.tealSoft }}>
              <CheckCircle2 size={15} color={C.teal} />
            </div>
          </div>
          <div className="emp-att-metric-val">
            {presentDays}
          </div>
          <div className="emp-att-metric-sub">Standard in-office logs</div>
        </Card>

        <Card accent={C.blue}>
          <div className="emp-att-metric-header">
            <span className="emp-att-metric-label">WFH Days</span>
            <div className="emp-att-metric-icon" style={{ background: C.blueSoft }}>
              <Home size={15} color={C.blue} />
            </div>
          </div>
          <div className="emp-att-metric-val">
            {wfhDays}
          </div>
          <div className="emp-att-metric-sub">Remote work check-ins</div>
        </Card>

        <Card accent={C.amber}>
          <div className="emp-att-metric-header">
            <span className="emp-att-metric-label">Late Arrivals</span>
            <div className="emp-att-metric-icon" style={{ background: C.amberSoft }}>
              <AlertCircle size={15} color={C.amber} />
            </div>
          </div>
          <div className="emp-att-metric-val">
            {lateDays}
          </div>
          <div className="emp-att-metric-sub">After shift grace period</div>
        </Card>

        <Card accent={C.ink}>
          <div className="emp-att-metric-header">
            <span className="emp-att-metric-label">Total Logged</span>
            <div className="emp-att-metric-icon" style={{ background: "#EEF1F5" }}>
              <Timer size={15} color={C.ink} />
            </div>
          </div>
          <div className="emp-att-metric-val">
            {totalDays}
          </div>
          <div className="emp-att-metric-sub">Recorded work entries</div>
        </Card>
      </div>

      {/* ── ATTENDANCE LOG TABLE ── */}
      <Card style={{ padding: 0 }}>
        <div className="emp-att-table-header">
          <div>
            <h3 className="emp-att-table-title">
              My Attendance Records
            </h3>
            <p className="emp-att-table-sub">
              Chronological check-in and check-out logs
            </p>
          </div>

          {/* Filter Pills */}
          <div className="emp-att-filter-pills">
            {["All", "Present", "WFH", "Late", "Absent"].map((s) => (
              <div key={s} onClick={() => setFilter(s)} className="emp-att-filter-pill-item">
                <Pill tone={s === filter ? statusTone(s === "All" ? "Active" : s) : "slate"}>
                  {s}
                </Pill>
              </div>
            ))}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="emp-att-empty-box">
            <EmptyState text={`No attendance records found for "${filter}".`} />
          </div>
        ) : (
          <Table
            columns={["Date", "Status", "Check-In", "Check-Out", "Duration", "Remarks"]}
            rows={filteredHistory}
            renderRow={(a, idx) => {
              const dur = calculateHoursWorked(a.checkIn, a.checkOut);
              return (
                <tr key={a.id || idx} className="hoverable emp-att-table-row">
                  <td className="emp-att-table-cell emp-att-date-cell">
                    <div className="emp-att-date-flex">
                      <Calendar size={14} color={C.slateLight} />
                      {a.date}
                    </div>
                  </td>
                  <td className="emp-att-table-cell">
                    <Pill tone={statusTone(a.status)}>{a.status}</Pill>
                  </td>
                  <td className="emp-att-table-cell emp-att-time-cell">
                    <div className="emp-att-time-flex">
                      <Clock size={13} color={C.teal} />
                      {a.checkIn || "--"}
                    </div>
                  </td>
                  <td className="emp-att-table-cell emp-att-time-cell" style={{ color: C.slate }}>
                    {a.checkOut || "--"}
                  </td>
                  <td className={`emp-att-table-cell emp-att-dur-cell ${dur !== "--" ? "active" : "muted"}`}>
                    {dur}
                  </td>
                  <td className="emp-att-table-cell emp-att-remark-cell">
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
