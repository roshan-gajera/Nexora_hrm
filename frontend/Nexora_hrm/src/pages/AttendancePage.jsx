import React, { useState } from "react";
import { Clock } from "lucide-react";
import { C } from "../constants/theme";
import { statusTone } from "../utils/helpers";
import { Card, PageHeader, Table, Avatar, Pill } from "../components/ui";

export default function AttendancePage({ attendance }) {
  const [filter, setFilter] = useState("All");

  const counts   = ["Present", "Late", "WFH", "Absent"].map((s) => ({ status: s, count: attendance.filter((a) => a.status === s).length }));
  const filtered = filter === "All" ? attendance : attendance.filter((a) => a.status === filter);

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Today's check-ins across the organization — Jul 12, 2026" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 16, marginBottom: 20 }}>
        {counts.map((c) => (
          <Card key={c.status} accent={{ Present: C.teal, Late: C.amber, WFH: C.blue, Absent: C.coral }[c.status]}>
            <div style={{ fontSize: 12.5, color: C.slate, fontWeight: 600, marginBottom: 8 }}>{c.status}</div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 24, fontWeight: 700, color: C.ink }}>{c.count}</div>
          </Card>
        ))}
      </div>

      <Card style={{ padding: 0 }}>
        <div style={{ padding: 16, display: "flex", gap: 8, borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
          {["All", "Present", "Late", "WFH", "Absent"].map((s) => (
            <div key={s} onClick={() => setFilter(s)} style={{ cursor: "pointer" }}>
              <Pill tone={s === filter ? statusTone(s === "All" ? "Active" : s) : "slate"}>{s}</Pill>
            </div>
          ))}
        </div>
        <Table
          columns={["Employee", "Department", "Check-in", "Check-out", "Status"]}
          rows={filtered}
          renderRow={(a) => (
            <tr key={a.employeeId} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 8 }}><Avatar name={a.name} size={28} />{a.name}</td>
              <td style={{ padding: "11px 14px", color: C.slate }}>{a.department}</td>
              <td style={{ padding: "11px 14px", color: C.slate, display: "flex", alignItems: "center", gap: 6 }}><Clock size={13} />{a.checkIn}</td>
              <td style={{ padding: "11px 14px", color: C.slate }}>{a.checkOut}</td>
              <td style={{ padding: "11px 14px" }}><Pill tone={statusTone(a.status)}>{a.status}</Pill></td>
            </tr>
          )}
        />
      </Card>
    </div>
  );
}
