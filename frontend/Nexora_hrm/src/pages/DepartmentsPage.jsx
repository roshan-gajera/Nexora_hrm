import React from "react";
import { Building2 } from "lucide-react";
import { C } from "../constants/theme";
import { Card, PageHeader, Avatar } from "../components/ui";

export default function DepartmentsPage({ departments, employees }) {
  return (
    <div>
      <PageHeader title="Departments" subtitle="Organizational structure and headcount by function" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: 16 }}>
        {departments.map((d) => {
          const staff = employees.filter((e) => e.department === d.name);
          return (
            <Card key={d.id} accent={d.color}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 16, color: C.ink }}>{d.name}</div>
                  <div style={{ fontSize: 12.5, color: C.slate, marginTop: 2 }}>Head: {d.head}</div>
                </div>
                <Building2 size={20} color={d.color} />
              </div>
              <div style={{ fontFamily: "Sora, sans-serif", fontSize: 24, fontWeight: 700, color: C.ink, marginBottom: 10 }}>
                {staff.length} <span style={{ fontSize: 12.5, fontWeight: 500, color: C.slateLight }}>employees</span>
              </div>
              <div style={{ display: "flex", marginLeft: 4 }}>
                {staff.slice(0, 5).map((s, i) => (
                  <div key={s.id} style={{ marginLeft: i === 0 ? 0 : -10, border: `2px solid ${C.panel}`, borderRadius: "50%" }}>
                    <Avatar name={s.name} size={30} />
                  </div>
                ))}
                {staff.length > 5 && (
                  <div style={{ marginLeft: -10, width: 30, height: 30, borderRadius: "50%", background: C.canvas, border: `2px solid ${C.panel}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontFamily: "Inter, sans-serif", fontWeight: 700, color: C.slate }}>
                    +{staff.length - 5}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
