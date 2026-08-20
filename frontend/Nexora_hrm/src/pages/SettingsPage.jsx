import React, { useState } from "react";
import { C } from "../constants/theme";
import { Card, PageHeader, Button, Input, Select, Avatar } from "../components/ui";

export default function SettingsPage() {
  const [tab, setTab] = useState("Company");
  const tabs = ["Company", "Users", "Profile", "Notifications"];

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage company details and preferences" />

      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        {tabs.map((t) => (
          <div key={t} onClick={() => setTab(t)} style={{ padding: "7px 16px", borderRadius: 8, cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, background: tab === t ? C.ink : C.panel, color: tab === t ? "#fff" : C.slate, border: `1px solid ${tab === t ? C.ink : C.border}` }}>
            {t}
          </div>
        ))}
      </div>

      <Card style={{ maxWidth: 560 }}>
        {tab === "Company" && (
          <>
            <Input  label="Company name"  defaultValue="Nexora HRM Pvt Ltd" />
            <Input label="Enter password" placeholder="••••••••" type="password"/>
            <Input  label="Support email" defaultValue="hr@nexorahrm.com" />
            <Select label="Time zone"     defaultValue="IST (UTC+5:30)" options={["IST (UTC+5:30)", "PST (UTC-8:00)", "GMT (UTC+0:00)"]} />
            <Select label="Work week"     defaultValue="Mon – Fri"       options={["Mon – Fri", "Mon – Sat"]} />
            <Button variant="primary">Save changes</Button>
          </>
        )}{tab === "Users" && (
          <>
            <Input  label="Company name"  defaultValue="Nexora HRM Pvt Ltd" />
            <Input label="Enter password" placeholder="••••••••" type="password"/>
            <Input  label="Support email" defaultValue="hr@nexorahrm.com" />
            <Select label="Time zone"     defaultValue="IST (UTC+5:30)" options={["IST (UTC+5:30)", "PST (UTC-8:00)", "GMT (UTC+0:00)"]} />
            <Select label="Work week"     defaultValue="Mon – Fri"       options={["Mon – Fri", "Mon – Sat"]} />
            <Button variant="primary">Save changes</Button>
          </>
        )}
        {tab === "Profile" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <Avatar name="Priya Nair" size={56} />
              <Button variant="outline" small>Change photo</Button>
            </div>
            <Input label="Full name" defaultValue="Priya Nair" />
            <Input label="Email"     defaultValue="priya.nair@nexorahrm.com" />
            <Input label="Role"      defaultValue="HR Administrator" disabled />
            <Button variant="primary">Update profile</Button>
          </>
        )}
        {tab === "Notifications" && (
          <>
            {["New leave requests", "Payroll run reminders", "New candidate applications", "Performance review due dates"].map((n) => (
              <label key={n} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}`, fontFamily: "Inter, sans-serif", fontSize: 13.5, color: C.ink }}>
                {n}
                <input type="checkbox" defaultChecked />
              </label>
            ))}
          </>
        )}
      </Card>
    </div>
  );
}
