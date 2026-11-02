import React, { useState, useEffect } from "react";
import {
  CalendarDays, CalendarCheck, Wallet, Clock, TrendingUp,
  FileText, Sun, ArrowUpRight, Briefcase, Megaphone, KeyRound,
} from "lucide-react";
import { C } from "../constants/theme";
import { Card, Avatar, Pill, EmptyState, Button } from "../components/ui";
import { statusTone, fmtMoney } from "../utils/helpers";
import { fetchMyLeaves, fetchMyPayslips, fetchMyAttendance } from "../api/employeePortalApi";
import { fetchAnnouncements } from "../api/hrmApi";
import ChangePasswordModal from "../components/common/ChangePasswordModal";
import "../styles/EmpDashboardPage.css";

export default function EmpDashboardPage({ user, setPage }) {
  const [leaves,        setLeaves]        = useState([]);
  const [payslips,      setPayslips]      = useState([]);
  const [attendance,    setAttendance]    = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.allSettled([
      fetchMyLeaves(),
      fetchMyPayslips(),
      fetchMyAttendance(),
      fetchAnnouncements(),
    ]).then(([lr, pr, ar, annRes]) => {
      if (!mounted) return;
      if (lr.status === "fulfilled") setLeaves(Array.isArray(lr.value) ? lr.value : lr.value?.results || []);
      if (pr.status === "fulfilled") setPayslips(Array.isArray(pr.value) ? pr.value : pr.value?.results || []);
      if (ar.status === "fulfilled") setAttendance(Array.isArray(ar.value) ? ar.value : ar.value?.results || []);
      if (annRes.status === "fulfilled") setAnnouncements(Array.isArray(annRes.value) ? annRes.value : annRes.value?.results || []);
    }).finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, []);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const greetHour = new Date().getHours();
  const greet = greetHour < 12 ? "Good morning" : greetHour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.first_name || user?.email?.split("@")[0] || "there";

  const pendingLeaves  = leaves.filter((l) => l.status === "Pending");
  const approvedLeaves = leaves.filter((l) => l.status === "Approved");
  const latestPayslip  = payslips.length > 0 ? payslips[0] : null;
  const presentDays    = attendance.filter((a) => a.status === "Present" || a.status === "WFH").length;

  if (loading) {
    return (
      <div className="emp-dashboard-loading">
        Loading your dashboard...
      </div>
    );
  }

  return (
    <div className="page-enter">
      {/* Hero Greeting */}
      <div className="emp-dashboard-hero">
        <div className="emp-dashboard-hero-circle-1" />
        <div className="emp-dashboard-hero-circle-2" />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 14, position: "relative", zIndex: 1 }}>
          <div className="emp-dashboard-hero-content">
            <div className="emp-dashboard-hero-date-row">
              <Sun size={18} color={C.teal} />
              <span className="emp-dashboard-hero-date">
                {today}
              </span>
            </div>
            <h1 className="emp-dashboard-hero-title">
              {greet}, {firstName}
            </h1>
            <p className="emp-dashboard-hero-subtitle">
              Here's a quick snapshot of your work life today.
            </p>
          </div>

        </div>
      </div>

      {/* Quick Stats */}
      <div className="emp-dashboard-stats-grid">
        <QuickStat label="Leave Balance (Until 2027)" value={`${31 - approvedLeaves.length}`} sub="days remaining" icon={CalendarDays} accent={C.blue} trend={`${approvedLeaves.length} used`} positive />
        <QuickStat label="Pending Leave Requests" value={pendingLeaves.length} sub="awaiting approval" icon={Clock} accent={C.amber} trend={pendingLeaves.length > 0 ? "Action needed" : "All clear"} positive={pendingLeaves.length === 0} />
        <QuickStat label="Days Present (this month)" value={presentDays} icon={CalendarCheck} accent={C.teal} trend="On track" positive />
        <QuickStat label="Last Payslip" value={latestPayslip ? fmtMoney(latestPayslip.net || latestPayslip.net_salary || 0) : "—"} sub={latestPayslip?.month || "No data"} icon={Wallet} accent={C.coral} trend={latestPayslip?.status === "Paid" ? "Paid" : "Pending"} positive={latestPayslip?.status === "Paid"} />
      </div>

      {/* Two-column layout */}
      <div className="emp-dashboard-two-col">

        {/* Recent Leave Requests */}
        <Card>
          <div className="emp-card-header">
            <div className="emp-card-title-row">
              <CalendarDays size={16} color={C.blue} />
              <span className="emp-card-title">My Leave Requests</span>
            </div>
            <Button variant="outline" small onClick={() => setPage("emp-leave")}>View all</Button>
          </div>

          {leaves.length === 0 ? (
            <EmptyState text="No leave requests yet. Apply when you need time off." />
          ) : (
            <div className="emp-card-list">
              {leaves.slice(0, 4).map((l) => (
                <div key={l.id} className="emp-card-item">
                  <div>
                    <div className="emp-card-item-title">
                      {l.type || l.leave_type || "Leave"}
                    </div>
                    <div className="emp-card-item-sub">
                      {l.from || l.from_date} → {l.to || l.to_date} · {l.days}d
                    </div>
                  </div>
                  <Pill tone={statusTone(l.status)}>{l.status}</Pill>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Payslips */}
        <Card>
          <div className="emp-card-header">
            <div className="emp-card-title-row">
              <Wallet size={16} color={C.teal} />
              <span className="emp-card-title">Recent Payslips</span>
            </div>
            <Button variant="outline" small onClick={() => setPage("emp-payslips")}>View all</Button>
          </div>

          {payslips.length === 0 ? (
            <EmptyState text="No payslips available yet." />
          ) : (
            <div className="emp-card-list">
              {payslips.slice(0, 4).map((p) => (
                <div key={p.id} className="emp-card-item">
                  <div>
                    <div className="emp-card-item-title">
                      {p.month || "Payslip"}
                    </div>
                    <div className="emp-card-item-sub">
                      Net: {fmtMoney(p.net || p.net_salary || 0)}
                    </div>
                  </div>
                  <Pill tone={statusTone(p.status)}>{p.status}</Pill>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Company Announcements & Job Openings */}
      <div style={{ marginTop: 20 }}>
        <Card>
          <div className="emp-card-header">
            <div className="emp-card-title-row">
              <Briefcase size={16} color={C.teal} />
              <span className="emp-card-title">Company Announcements & Open Positions</span>
            </div>
            {announcements.length > 0 && (
              <Pill tone="teal">{announcements.length} update{announcements.length > 1 ? "s" : ""}</Pill>
            )}
          </div>

          {announcements.length === 0 ? (
            <EmptyState text="No current job openings or company announcements." />
          ) : (
            <div className="emp-card-list">
              {announcements.slice(0, 5).map((a) => {
                const isJob = (a.title || "").toLowerCase().includes("job") || (a.title || "").toLowerCase().includes("hiring") || (a.title || "").toLowerCase().includes("opening");
                return (
                  <div key={a.id} className="emp-card-item">
                    <div style={{ flex: 1, paddingRight: 12 }}>
                      <div className="emp-card-item-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>{a.title}</span>
                        {isJob && <Pill tone="teal">Hiring</Pill>}
                      </div>
                      <div className="emp-card-item-sub" style={{ marginTop: 4, lineHeight: 1.4 }}>
                        {a.content}
                      </div>
                    </div>
                    <Pill tone={a.priority === "Urgent" || a.priority === "High" ? "coral" : "blue"}>
                      {a.priority || "Info"}
                    </Pill>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="emp-dashboard-actions-grid">
        {[
          { label: "Punch In / Attendance", icon: CalendarCheck, page: "emp-attendance", accent: C.teal,  desc: "Daily clock-in & status" },
          { label: "Apply for Leave",        icon: CalendarDays,  page: "emp-leave",      accent: C.blue,  desc: "Request time off" },
          { label: "View Payslips",          icon: FileText,      page: "emp-payslips",   accent: C.amber, desc: "Download salary slips" },
          { label: "Change Password",        icon: KeyRound,      action: () => setShowChangePassword(true), accent: "#6B46A8", desc: "Update login password" },
        ].map((q) => (
          <div
            key={q.label}
            onClick={q.action ? q.action : () => setPage(q.page)}
            className="emp-action-card"
          >
            <div
              className="emp-action-icon-box"
              style={{ background: q.accent + "18" }}
            >
              <q.icon size={20} color={q.accent} />
            </div>
            <div className="emp-action-info">
              <div className="emp-action-title">{q.label}</div>
              <div className="emp-action-desc">{q.desc}</div>
            </div>
            <ArrowUpRight size={16} color={C.slateLight} />
          </div>
        ))}
      </div>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}

/* ── Quick Stat Card ── */
function QuickStat({ label, value, sub, icon: Icon, accent, trend, positive }) {
  return (
    <Card accent={accent}>
      <div className="emp-stat-card">
        <div className="emp-stat-header">
          <span className="emp-stat-label">{label}</span>
          <div
            className="emp-stat-icon-box"
            style={{ background: accent + "14" }}
          >
            <Icon size={16} color={accent} />
          </div>
        </div>
        <div>
          <span className="emp-stat-value">{value}</span>
          {sub && <span className="emp-stat-sub">{sub}</span>}
        </div>
        {trend && (
          <div className={`emp-stat-trend ${positive ? "positive" : "warning"}`}>
            {positive ? <TrendingUp size={13} /> : <Clock size={13} />}
            {trend}
          </div>
        )}
      </div>
    </Card>
  );
}
