import React, { useState, useEffect } from "react";
import {
  CalendarDays, CalendarCheck, Wallet, Clock, TrendingUp,
  FileText, Sun, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { C } from "../constants/theme";
import { Card, PageHeader, Avatar, Pill, EmptyState, Button } from "../components/ui";
import { statusTone, fmtMoney } from "../utils/helpers";
import { fetchMyLeaves, fetchMyPayslips, fetchMyAttendance } from "../api/employeePortalApi";

export default function EmpDashboardPage({ user, setPage }) {
  const [leaves,     setLeaves]     = useState([]);
  const [payslips,   setPayslips]   = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.allSettled([
      fetchMyLeaves(),
      fetchMyPayslips(),
      fetchMyAttendance(),
    ]).then(([lr, pr, ar]) => {
      if (!mounted) return;
      if (lr.status === "fulfilled") setLeaves(Array.isArray(lr.value) ? lr.value : lr.value?.results || []);
      if (pr.status === "fulfilled") setPayslips(Array.isArray(pr.value) ? pr.value : pr.value?.results || []);
      if (ar.status === "fulfilled") setAttendance(Array.isArray(ar.value) ? ar.value : ar.value?.results || []);
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
      <div style={{ padding: 40, textAlign: "center", color: C.slate, fontFamily: "Inter, sans-serif" }}>
        Loading your dashboard...
      </div>
    );
  }

  return (
    <div className="page-enter">
      {/* Hero Greeting */}
      <div style={{
        background: `linear-gradient(135deg, ${C.ink} 0%, #1E2E52 100%)`,
        borderRadius: 16,
        padding: "32px 36px",
        marginBottom: 24,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", border: "1px solid rgba(31,138,112,0.2)", top: -60, right: -40 }} />
        <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)", bottom: -30, right: 80 }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Sun size={18} color={C.teal} />
            <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12, letterSpacing: 1, color: C.teal, textTransform: "uppercase" }}>
              {today}
            </span>
          </div>
          <h1 style={{ fontFamily: "Sora, sans-serif", fontSize: 28, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>
            {greet}, {firstName}
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "rgba(255,255,255,0.6)", margin: 0 }}>
            Here's a quick snapshot of your work life today.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <QuickStat
          label="Leave Balance"
          value={`${12 - approvedLeaves.length}`}
          sub="days remaining"
          icon={CalendarDays}
          accent={C.blue}
          trend={`${approvedLeaves.length} used`}
          positive
        />
        <QuickStat
          label="Pending Requests"
          value={pendingLeaves.length}
          sub="awaiting approval"
          icon={Clock}
          accent={C.amber}
          trend={pendingLeaves.length > 0 ? "Action needed" : "All clear"}
          positive={pendingLeaves.length === 0}
        />
        <QuickStat
          label="Days Present"
          value={presentDays}
          sub="this month"
          icon={CalendarCheck}
          accent={C.teal}
          trend="On track"
          positive
        />
        <QuickStat
          label="Last Payslip"
          value={latestPayslip ? fmtMoney(latestPayslip.net || latestPayslip.net_salary || 0) : "—"}
          sub={latestPayslip?.month || "No data"}
          icon={Wallet}
          accent={C.coral}
          trend={latestPayslip?.status === "Paid" ? "Paid" : "Pending"}
          positive={latestPayslip?.status === "Paid"}
        />
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, marginBottom: 24 }}>

        {/* Recent Leave Requests */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CalendarDays size={16} color={C.blue} />
              <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, color: C.ink }}>My Leave Requests</span>
            </div>
            <Button variant="outline" small onClick={() => setPage("emp-leave")}>View all</Button>
          </div>

          {leaves.length === 0 ? (
            <EmptyState text="No leave requests yet. Apply when you need time off." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {leaves.slice(0, 4).map((l, i) => (
                <div key={l.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < Math.min(leaves.length, 4) - 1 ? `1px solid ${C.border}` : "none" }}>
                  <div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: C.ink }}>
                      {l.type || l.leave_type || "Leave"}
                    </div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.slateLight, marginTop: 2 }}>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Wallet size={16} color={C.teal} />
              <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, color: C.ink }}>Recent Payslips</span>
            </div>
            <Button variant="outline" small onClick={() => setPage("emp-payslips")}>View all</Button>
          </div>

          {payslips.length === 0 ? (
            <EmptyState text="No payslips available yet." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {payslips.slice(0, 4).map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < Math.min(payslips.length, 4) - 1 ? `1px solid ${C.border}` : "none" }}>
                  <div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: C.ink }}>
                      {p.month || "Payslip"}
                    </div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.slateLight, marginTop: 2 }}>
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

      {/* Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {[
          { label: "Apply for Leave",  icon: CalendarDays, page: "emp-leave",    accent: C.blue,  desc: "Request time off" },
          { label: "View Payslips",    icon: FileText,     page: "emp-payslips", accent: C.teal,  desc: "Download salary slips" },
        ].map((q) => (
          <div
            key={q.label}
            onClick={() => setPage(q.page)}
            style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "20px 22px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 14,
              transition: "box-shadow 0.2s, transform 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(20,33,61,0.1)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 10, background: q.accent + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <q.icon size={20} color={q.accent} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, color: C.ink }}>{q.label}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.slateLight, marginTop: 2 }}>{q.desc}</div>
            </div>
            <ArrowUpRight size={16} color={C.slateLight} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Quick Stat Card ── */
function QuickStat({ label, value, sub, icon: Icon, accent, trend, positive }) {
  return (
    <Card accent={accent} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.slate, fontWeight: 600 }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: accent + "14", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} color={accent} />
        </div>
      </div>
      <div>
        <span style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: C.ink }}>{value}</span>
        {sub && <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.slateLight, marginLeft: 6 }}>{sub}</span>}
      </div>
      {trend && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: positive ? C.teal : C.amber }}>
          {positive ? <TrendingUp size={13} /> : <Clock size={13} />}
          {trend}
        </div>
      )}
    </Card>
  );
}
