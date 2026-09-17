import React, { useState, useEffect } from "react";
import { Users, CalendarCheck, CalendarDays, Briefcase, Plus, Download, UserCheck } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { C } from "../constants/theme";
import { JOBS_SEED } from "../data/mockData";
import { statusTone, fmtMoney } from "../utils/helpers";
import { Card, PageHeader, StatCard, Table, Avatar, Pill, EmptyState, Button } from "../components/ui";
import { fetchEmployees } from "../api/employeesApi";
import { fetchDepartments } from "../api/departmentsApi";
import { fetchLeaves } from "../api/leavesApi";
import { fetchAttendance } from "../api/attendanceApi";

const ACTIVITY = [
  { id: 1, name: "Rahul Sharma",   action: "applied for Casual Leave",       time: "2m ago",  tone: "amber" },
  { id: 2, name: "Priya Nair",     action: "approved Neha Gupta's leave",    time: "18m ago", tone: "teal"  },
  { id: 3, name: "Vikram Rao",     action: "processed June payroll",         time: "1h ago",  tone: "blue"  },
  { id: 4, name: "Aditi Rao",      action: "moved to Interview stage",       time: "2h ago",  tone: "slate" },
  { id: 5, name: "Karan Shah",     action: "completed performance review",   time: "3h ago",  tone: "teal"  },
];

export default function DashboardPage({ setPage }) {
  const [employees,   setEmployees]   = useState([]);
  const [departments, setDepartments] = useState([]);
  const [leaves,      setLeaves]      = useState([]);
  const [attendance,  setAttendance]  = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.allSettled([
      fetchEmployees(),
      fetchDepartments(),
      fetchLeaves(),
      fetchAttendance(),
    ]).then(([empRes, deptRes, leaveRes, attRes]) => {
      if (!isMounted) return;
      if (empRes.status   === "fulfilled") setEmployees(  Array.isArray(empRes.value)   ? empRes.value   : empRes.value?.results   || []);
      if (deptRes.status  === "fulfilled") setDepartments(Array.isArray(deptRes.value)  ? deptRes.value  : deptRes.value?.results  || []);
      if (leaveRes.status === "fulfilled") setLeaves(     Array.isArray(leaveRes.value) ? leaveRes.value : leaveRes.value?.results || []);
      if (attRes.status   === "fulfilled") setAttendance( Array.isArray(attRes.value)   ? attRes.value   : attRes.value?.results   || []);
    }).finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, []);

  const headcountTrend = [
    { month: "Feb", count: 172 }, { month: "Mar", count: 178 }, { month: "Apr", count: 183 },
    { month: "May", count: 189 }, { month: "Jun", count: 196 }, { month: "Jul", count: employees.length + 172 },
  ];

  const deptData      = departments.map((d) => ({ name: d.name.split(" ")[0], value: employees.filter((e) => e.department === d.name).length, color: d.color }));
  const pendingLeaves = leaves.filter((l) => l.status === "Pending").slice(0, 5);
  const presentToday  = attendance.filter((a) => a.status === "Present" || a.status === "WFH").length;

  const attendanceData = [
    { status: "Present", count: attendance.filter((a) => a.status === "Present").length, fill: C.teal  },
    { status: "WFH",     count: attendance.filter((a) => a.status === "WFH").length,     fill: C.blue  },
    { status: "Late",    count: attendance.filter((a) => a.status === "Late").length,     fill: C.amber },
    { status: "Absent",  count: attendance.filter((a) => a.status === "Absent").length,   fill: C.coral },
  ];

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.slate, fontFamily: "Inter, sans-serif" }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="Dashboard"
        subtitle={today}
        action={
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="outline" icon={Download} small>Export CSV</Button>
            <Button icon={Plus} small onClick={() => setPage("employees")}>Add Employee</Button>
          </div>
        }
      />

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 20 }}>
        <StatCard label="Total Employees"       value={employees.length}                                            delta="+4.2% this quarter" positive icon={Users}       accent={C.blue}  />
        <StatCard label="Present Today"         value={`${presentToday}/${attendance.length}`}                      delta="On track"           positive icon={CalendarCheck} accent={C.teal}  />
        <StatCard label="Pending Leave Requests" value={pendingLeaves.length}                                       delta="Needs review"  positive={false} icon={CalendarDays} accent={C.amber} />
        <StatCard label="Open Positions"        value={JOBS_SEED.filter((j) => j.status === "Open").length}         delta="Across 4 depts"    positive icon={Briefcase}   accent={C.coral} />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 20 }}>
        <Card>
          <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, color: C.ink, margin: "0 0 14px" }}>Headcount trend</p>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={headcountTrend}>
              <CartesianGrid stroke={C.border} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fontFamily: "Inter" }} stroke="transparent" />
              <YAxis tick={{ fontSize: 12, fontFamily: "Inter" }} stroke="transparent" domain={["auto", "auto"]} />
              <Tooltip contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8, border: `1px solid ${C.border}` }} />
              <Line type="monotone" dataKey="count" stroke={C.teal} strokeWidth={2.5} dot={{ r: 4, fill: C.teal }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, color: C.ink, margin: "0 0 14px" }}>By department</p>
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
      </div>

      {/* Attendance bar + Activity feed */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 20 }}>
        <Card>
          <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, color: C.ink, margin: "0 0 14px" }}>Today's attendance breakdown</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={attendanceData} barSize={36}>
              <CartesianGrid stroke={C.border} vertical={false} />
              <XAxis dataKey="status" tick={{ fontSize: 12, fontFamily: "Inter" }} stroke="transparent" />
              <YAxis tick={{ fontSize: 12, fontFamily: "Inter" }} stroke="transparent" />
              <Tooltip contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {attendanceData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, color: C.ink, margin: "0 0 14px" }}>Recent activity</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {ACTIVITY.map((a, i) => (
              <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: i < ACTIVITY.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <Avatar name={a.name} size={28} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: C.ink }}>{a.name} </span>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.slate }}>{a.action}</span>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.slateLight, marginTop: 2 }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Add Employee",    icon: Users,        page: "employees",   accent: C.blue  },
          { label: "Approve Leaves",  icon: CalendarDays, page: "leave",       accent: C.amber },
          { label: "Run Payroll",     icon: Briefcase,    page: "payroll",     accent: C.teal  },
          { label: "Post a Job",      icon: UserCheck,    page: "recruitment", accent: C.coral },
        ].map((q) => (
          <div key={q.label} onClick={() => setPage(q.page)} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "box-shadow 0.15s" }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 4px 16px rgba(20,33,61,0.08)"}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
          >
            <div style={{ width: 34, height: 34, borderRadius: 8, background: q.accent + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <q.icon size={16} color={q.accent} />
            </div>
            <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: C.ink }}>{q.label}</span>
          </div>
        ))}
      </div>

      {/* Pending leaves table */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, color: C.ink, margin: 0 }}>Pending leave requests</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                <tr key={l.id} className="hoverable" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={l.name} size={26} />{l.name}</div>
                  </td>
                  <td style={{ padding: "10px 14px", color: C.slate }}>{l.type}</td>
                  <td style={{ padding: "10px 14px", color: C.slate }}>{l.from} → {l.to}</td>
                  <td style={{ padding: "10px 14px", color: C.slate }}>{l.days}d</td>
                  <td style={{ padding: "10px 14px" }}><Pill tone={statusTone(l.status)}>{l.status}</Pill></td>
                </tr>
              )}
            />
          )}
      </Card>
    </div>
  );
}
