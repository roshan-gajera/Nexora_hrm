import React, { useState, useEffect } from "react";
import { Users, CalendarCheck, CalendarDays, Briefcase, Plus, Download, UserCheck, AlertTriangle, X, CreditCard } from "lucide-react";
import {
  PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { C } from "../constants/theme";
import { JOBS_SEED } from "../data/mockData";
import { statusTone } from "../utils/helpers";
import { Card, PageHeader, StatCard, Table, Avatar, Pill, EmptyState, Button } from "../components/ui";
import { fetchEmployees } from "../api/employeesApi";
import { fetchDepartments } from "../api/departmentsApi";
import { fetchLeaves } from "../api/leavesApi";
import { fetchAttendanceToday } from "../api/attendanceApi";
import { fetchActivityFeed } from "../api/notificationsApi";
import "../styles/DashboardPage.css";

// Activity feed is loaded from the backend (real-time)
const TONE_COLORS = { teal: C.teal, amber: C.amber, coral: C.coral, blue: C.blue, slate: C.slate, purple: "#6B46A8" };

export default function DashboardPage({ setPage }) {
  const [employees,   setEmployees]   = useState([]);
  const [departments, setDepartments] = useState([]);
  const [leaves,      setLeaves]      = useState([]);
  const [attendance,  setAttendance]  = useState([]);
  const [activity,    setActivity]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [apiAlert,    setApiAlert]    = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.allSettled([
      fetchEmployees(),
      fetchDepartments(),
      fetchLeaves(),
      fetchAttendanceToday(),
      fetchActivityFeed(),
    ]).then(([empRes, deptRes, leaveRes, attRes, actRes]) => {
      if (!isMounted) return;

      // Check all results for 403 or subscription-expired errors
      const allResults = [empRes, deptRes, leaveRes, attRes];
      for (const res of allResults) {
        if (res.status === "rejected") {
          const err = res.reason;
          const status = err?.status;
          const msg = (err?.message || "").toLowerCase();
          const isSubscriptionExpired = status === 403 && (msg.includes("subscription") || msg.includes("expired") || msg.includes("plan"));

          if (isSubscriptionExpired) {
            setApiAlert({ type: "subscription", message: err.message || "Your subscription has expired. Please renew to continue." });
            break;
          } else if (status === 403) {
            setApiAlert({ type: "403", message: err.message || "Access denied (403 Forbidden). You do not have permission to view this data." });
            break;
          }
        }
      }

      if (empRes.status  === "fulfilled") setEmployees(  Array.isArray(empRes.value)  ? empRes.value  : empRes.value?.results   || []);
      if (deptRes.status === "fulfilled") setDepartments(Array.isArray(deptRes.value) ? deptRes.value : deptRes.value?.results  || []);
      if (leaveRes.status=== "fulfilled") setLeaves(     Array.isArray(leaveRes.value)? leaveRes.value: leaveRes.value?.results || []);
      if (attRes.status  === "fulfilled") setAttendance( Array.isArray(attRes.value)  ? attRes.value  : attRes.value?.results   || []);
      if (actRes.status  === "fulfilled") setActivity(   Array.isArray(actRes.value)  ? actRes.value  : actRes.value?.results   || []);
    }).finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, []);

  const deptData      = departments.map((d) => ({ name: d.name.split(" ")[0], value: employees.filter((e) => e.department === d.name).length, color: d.color }));
  const pendingLeaves = leaves.filter((l) => l.status === "Pending").slice(0, 5);

  const todayStr = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  })();

  const serverToday = attendance.find((a) => a.date)?.date;
  const targetDate = serverToday || todayStr;

  // Filter attendance strictly for today's date and present statuses (Present, WFH, Late)
  const presentToday = attendance.filter((a) => {
    const isToday = !a.date || a.date === targetDate || a.date === todayStr;
    const isPresent = a.status === "Present" || a.status === "WFH" || a.status === "Late";
    return isToday && isPresent;
  }).length;

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  if (loading) {
    return (
      <div className="dashboard-loading">
        Loading dashboard...
      </div>
    );
  }

  const isSubscriptionAlert = apiAlert?.type === "subscription";

  return (
    <div className="page-enter">
      {/* ── API Alert Banner ── */}
      {apiAlert && (
        <div role="alert" className={`dashboard-alert-banner ${isSubscriptionAlert ? "subscription" : "error"}`}>
          {/* Icon */}
          <div className="dashboard-alert-icon-box">
            {isSubscriptionAlert ? <CreditCard size={18} color={C.amber} /> : <AlertTriangle size={18} color={C.coral} />}
          </div>

          {/* Text */}
          <div className="dashboard-alert-body">
            <p className="dashboard-alert-title">{isSubscriptionAlert ? "Subscription Expired" : "Access Denied (403 Forbidden)"}</p>
            <p className="dashboard-alert-text">{apiAlert.message}</p>
            {isSubscriptionAlert && (
              <button type="button" onClick={() => setPage("subscription")} className="dashboard-alert-renew-btn">
                Renew Subscription →
              </button>
            )}
          </div>

          {/* Dismiss */}
          <button type="button" onClick={() => setApiAlert(null)} title="Dismiss" className="dashboard-alert-dismiss-btn">
            <X size={16} />
          </button>
        </div>
      )}

      <PageHeader title="Dashboard" subtitle={today} action={
          <div className="dashboard-header-actions">
            <Button variant="outline" icon={Download} small>Export CSV</Button>
            <Button icon={Plus} small onClick={() => setPage("employees")}>Add Employee</Button>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="dashboard-stats-grid">
        <StatCard label="Total Employees" value={employees.length} delta="+4.2% this quarter" positive icon={Users} accent={C.blue}  />
        <StatCard label="Present Today" value={presentToday+"/"+employees.length} delta="On track" positive icon={CalendarCheck} accent={C.teal}  />
        <StatCard label="Pending Leave Requests" value={pendingLeaves.length} delta="Needs review"  positive={false} icon={CalendarDays} accent={C.amber} />
        <StatCard label="Open Positions" value={JOBS_SEED.filter((j) => j.status === "Open").length} delta="Across 4 depts" positive icon={Briefcase}   accent={C.coral} />
      </div>

      {/* Quick actions */}
      <div className="dashboard-quick-actions-grid">
        {[
          { label: "Add Employee",    icon: Users,        page: "employees",   accent: C.blue  },
          { label: "Approve Leaves",  icon: CalendarDays, page: "leave",       accent: C.amber },
          { label: "Run Payroll",     icon: Briefcase,    page: "payroll",     accent: C.teal  },
          { label: "Post a Job",      icon: UserCheck,    page: "recruitment", accent: C.coral },
        ].map((q) => (
          <div
            key={q.label}
            onClick={() => setPage(q.page)}
            className="dashboard-quick-card"
          >
            <div
              className="dashboard-quick-icon-box"
              style={{ background: q.accent + "18" }}
            >
              <q.icon size={16} color={q.accent} />
            </div>
            <span className="dashboard-quick-label">{q.label}</span>
          </div>
        ))}
      </div>
      
      {/* Charts row */}
      <div className="dashboard-two-col-grid">
        <Card  style={{ height : "285px"}}>
          <p className="dashboard-card-title">By department</p>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={deptData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {deptData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontFamily: "Inter", fontSize: 11.5 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Activity feed */}
        <Card>
          <p className="dashboard-card-title">Recent activity</p>
          <div className="dashboard-activity-list">
            {activity.length === 0 ? (
              <div className="dashboard-activity-empty">
                No activity yet. Actions like employee creation, leave requests, and attendance check-ins will appear here.
              </div>
            ) : activity.map((a, i) => {
              const dot = TONE_COLORS[a.tone] ?? C.blue;
              return (
                <div key={a.id || i} className="dashboard-activity-item">
                  <div className="dashboard-activity-dot" style={{ background: dot }} />
                  <Avatar name={a.actor_name || "System"} size={26} />
                  <div className="dashboard-activity-content">
                    {a.actor_name && (
                      <span className="dashboard-activity-actor">{a.actor_name}{" "}</span>
                    )}
                    <span className="dashboard-activity-msg">{a.message}</span>
                    <div className="dashboard-activity-time">{a.time_ago}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Pending leaves table */}
      <Card>
        <div className="dashboard-table-header-row">
          <p className="dashboard-card-title" style={{ margin: 0 }}>Pending leave requests</p>
          <div className="dashboard-table-header-actions">
            <Pill tone="amber">{pendingLeaves.length} awaiting</Pill>
            <Button variant="outline" small onClick={() => setPage("leave")}>View all</Button>
          </div>
        </div>
        {pendingLeaves.length === 0
          ? <EmptyState text="No pending requests. Everyone's caught up." />
          : (
            <Table
              columns={["Employee", "Type", "Dates", "Days", "Status"]}
              rows={pendingLeaves}
              renderRow={(l) => (
                <tr key={l.id} className="hoverable dashboard-table-row">
                  <td className="dashboard-table-cell">
                    <div className="dashboard-employee-cell"><Avatar name={l.name} size={26} />{l.name}</div>
                  </td>
                  <td className="dashboard-table-cell muted">{l.type}</td>
                  <td className="dashboard-table-cell muted">{l.from} → {l.to}</td>
                  <td className="dashboard-table-cell muted">{l.days}d</td>
                  <td className="dashboard-table-cell"><Pill tone={statusTone(l.status)}>{l.status}</Pill></td>
                </tr>
              )}
            />
          )}
      </Card>
    </div>
  );
}
