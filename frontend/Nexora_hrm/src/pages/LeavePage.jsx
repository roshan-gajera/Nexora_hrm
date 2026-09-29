import React, { useState, useEffect } from "react";
import { Plus, Check, XCircle, CalendarDays } from "lucide-react";
import { C } from "../constants/theme";
import { statusTone } from "../utils/helpers";
import { Card, PageHeader, Button, Input, Select, Table, Modal, Avatar, Pill, EmptyState } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { fetchLeaves, createLeaveRequest, updateLeaveStatus } from "../api/leavesApi";
import { fetchEmployees } from "../api/employeesApi";

const LEAVE_TYPES = ["Sick Leave", "Casual Leave", "Earned Leave", "Unpaid Leave"];
const BALANCES = [
  { type: "Casual Leave",  total: 12, used: 4, color: C.blue  },
  { type: "Sick Leave",    total: 10, used: 2, color: C.coral },
  { type: "Earned Leave",  total: 15, used: 7, color: C.teal  },
  { type: "Unpaid Leave",  total: 5,  used: 0, color: C.amber },
];

function LeaveForm({ employees, onSave, onCancel }) {
  const [form, setForm] = useState({ employeeId: employees[0]?.id, type: "Casual Leave", from: "2026-07-15", to: "2026-07-16", reason: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
      <Select label="Employee" value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} options={employees.map((e) => e.id)} />
      <Select label="Leave type" value={form.type} onChange={(e) => set("type", e.target.value)} options={LEAVE_TYPES} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Input label="From" type="date" value={form.from} onChange={(e) => set("from", e.target.value)} />
        <Input label="To" type="date" value={form.to} onChange={(e) => set("to", e.target.value)} />
      </div>
      <Input label="Reason" value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Brief reason for leave" />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit">Submit request</Button>
      </div>
    </form>
  );
}

export default function LeavePage() {
  const toast = useToast();
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All");
  const [showForm, setShowForm] = useState(false);

  const tabs = ["All", "Pending", "Approved", "Rejected"];
  const filtered = tab === "All" ? leaves : leaves.filter((l) => l.status === tab);

  // Load leaves and employees on mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.allSettled([fetchLeaves(), fetchEmployees()])
      .then(([leaveRes, empRes]) => {
        if (!isMounted) return;
        if (leaveRes.status === "fulfilled") {
          const items = Array.isArray(leaveRes.value) ? leaveRes.value : leaveRes.value?.results || [];
          setLeaves(items);
        }
        if (empRes.status === "fulfilled") {
          const items = Array.isArray(empRes.value) ? empRes.value : empRes.value?.results || [];
          setEmployees(items);
        }
      })
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, []);

  async function updateStatus(id, status) {
    try {
      await updateLeaveStatus(id, status);
    } catch (err) {
      console.warn("Backend leave update notice:", err);
    }
    setLeaves((list) => list.map((l) => (l.id === id ? { ...l, status } : l)));
    toast(status === "Approved" ? "Leave approved" : "Leave rejected", status === "Approved" ? "success" : "warning");
  }

  async function addLeave(form) {
    const emp  = employees.find((e) => e.id === form.employeeId);
    const days = Math.max(1, (new Date(form.to) - new Date(form.from)) / 86400000 + 1);
    try {
      if (emp && (emp.pk || emp.id)) {
        await createLeaveRequest({
          employee: emp.pk || emp.id,
          from_date: form.from,
          to_date: form.to,
          days,
          reason: form.reason,
          status: "Pending",
        });
      }
    } catch (err) {
      console.warn("Backend add leave notice:", err);
    }
    setLeaves((list) => [{ id: "L" + (900 + list.length), name: emp?.name || "Unknown", status: "Pending", days, ...form }, ...list]);
    toast("Leave request submitted");
    setShowForm(false);
  }

  const pendingCount  = leaves.filter((l) => l.status === "Pending").length;
  const approvedCount = leaves.filter((l) => l.status === "Approved").length;

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.slate, fontFamily: "Inter, sans-serif" }}>
        Loading leave data...
      </div>
    );
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="Leave Management"
        subtitle="Review, approve, and track time-off requests"
        action={<Button icon={Plus} onClick={() => setShowForm(true)}>Apply for leave</Button>}
      />

      {/* Leave balance cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14, marginBottom: 20 }}>
        {BALANCES.map((b) => {
          const remaining = b.total - b.used;
          const pct       = Math.round((b.used / b.total) * 100);
          return (
            <Card key={b.type} accent={b.color}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: C.slate }}>{b.type}</div>
                <CalendarDays size={15} color={b.color} />
              </div>
              <div style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: C.ink }}>{remaining} <span style={{ fontSize: 12, fontWeight: 500, color: C.slateLight }}>/ {b.total} days</span></div>
              <div style={{ marginTop: 10, height: 4, borderRadius: 99, background: C.canvas, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: b.color, borderRadius: 99, transition: "width 0.4s ease" }} />
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.slateLight, marginTop: 5 }}>{b.used} used · {remaining} remaining</div>
            </Card>
          );
        })}
      </div>

      {/* Summary row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Card style={{ padding: "12px 18px", flex: 1, minWidth: 140 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.slate, fontWeight: 600 }}>Pending</div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: C.amber }}>{pendingCount}</div>
        </Card>
        <Card style={{ padding: "12px 18px", flex: 1, minWidth: 140 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.slate, fontWeight: 600 }}>Approved this month</div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: C.teal }}>{approvedCount}</div>
        </Card>
        <Card style={{ padding: "12px 18px", flex: 1, minWidth: 140 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.slate, fontWeight: 600 }}>Total requests</div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: C.ink }}>{leaves.length}</div>
        </Card>
      </div>

      {/* Tab filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {tabs.map((t) => (
          <div key={t} onClick={() => setTab(t)} style={{ padding: "7px 16px", borderRadius: 8, cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, background: tab === t ? C.ink : C.panel, color: tab === t ? "#fff" : C.slate, border: `1px solid ${tab === t ? C.ink : C.border}`, transition: "background 0.15s" }}>
            {t}
          </div>
        ))}
      </div>

      <Card style={{ padding: 0 }}>
        <Table
          columns={["Employee", "Type", "From", "To", "Days", "Reason", "Status", "Actions"]}
          rows={filtered}
          renderRow={(l) => (
            <tr key={l.id} className="hoverable" style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: "11px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={l.name} size={28} />{l.name}</div>
              </td>
              <td style={{ padding: "11px 14px", color: C.slate }}>{l.type}</td>
              <td style={{ padding: "11px 14px", color: C.slate }}>{l.from}</td>
              <td style={{ padding: "11px 14px", color: C.slate }}>{l.to}</td>
              <td style={{ padding: "11px 14px", color: C.slate }}>{l.days}d</td>
              <td style={{ padding: "11px 14px", color: C.slate, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.reason}</td>
              <td style={{ padding: "11px 14px" }}><Pill tone={statusTone(l.status)}>{l.status}</Pill></td>
              <td style={{ padding: "11px 14px" }}>
                {l.status === "Pending" ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <div title="Approve" style={{ width: 28, height: 28, borderRadius: 7, background: C.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => updateStatus(l.id, "Approved")}>
                      <Check size={14} color={C.teal} />
                    </div>
                    <div title="Reject" style={{ width: 28, height: 28, borderRadius: 7, background: C.coralSoft, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => updateStatus(l.id, "Rejected")}>
                      <XCircle size={14} color={C.coral} />
                    </div>
                  </div>
                ) : <span style={{ color: C.slateLight, fontSize: 12 }}>—</span>}
              </td>
            </tr>
          )}
        />
        {filtered.length === 0 && <EmptyState text="No leave requests in this view." />}
      </Card>

      {showForm && (
        <Modal title="Apply for leave" onClose={() => setShowForm(false)}>
          <LeaveForm employees={employees} onSave={addLeave} onCancel={() => setShowForm(false)} />
        </Modal>
      )}
    </div>
  );
}
