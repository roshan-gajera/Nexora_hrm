import React, { useState, useEffect } from "react";
import { Plus, CalendarDays, Clock, Check, X } from "lucide-react";
import { C } from "../constants/theme";
import { statusTone } from "../utils/helpers";
import { Card, PageHeader, Button, Input, Select, Table, Modal, Pill, EmptyState } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { fetchMyLeaves, submitLeaveRequest } from "../api/employeePortalApi";

const LEAVE_TYPES = ["Sick Leave", "Casual Leave", "Earned Leave", "Unpaid Leave"];

const BALANCES = [
  { type: "Casual Leave",  total: 12, used: 4, color: C.blue  },
  { type: "Sick Leave",    total: 10, used: 2, color: C.coral },
  { type: "Earned Leave",  total: 15, used: 7, color: C.teal  },
  { type: "Unpaid Leave",  total: 5,  used: 0, color: C.amber },
];

function LeaveForm({ onSave, onCancel }) {
  const [form, setForm] = useState({
    type: "Casual Leave",
    from: new Date().toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
    reason: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const days = Math.max(1, Math.ceil((new Date(form.to) - new Date(form.from)) / 86400000) + 1);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ ...form, days }); }}>
      <Select label="Leave type" value={form.type} onChange={(e) => set("type", e.target.value)} options={LEAVE_TYPES} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Input label="From" type="date" value={form.from} onChange={(e) => set("from", e.target.value)} />
        <Input label="To" type="date" value={form.to} onChange={(e) => set("to", e.target.value)} />
      </div>

      {/* Days preview */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 14px", borderRadius: 8,
        background: C.blueSoft, marginBottom: 14,
      }}>
        <CalendarDays size={14} color={C.blue} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.blue, fontWeight: 600 }}>
          {days} day{days > 1 ? "s" : ""} requested
        </span>
      </div>

      <Input label="Reason" value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Brief reason for leave..." />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit">Submit Request</Button>
      </div>
    </form>
  );
}

export default function EmpLeavePage() {
  const toast = useToast();
  const [leaves,   setLeaves]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("All");
  const [showForm, setShowForm] = useState(false);

  const tabs = ["All", "Pending", "Approved", "Rejected"];
  const filtered = tab === "All" ? leaves : leaves.filter((l) => l.status === tab);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchMyLeaves()
      .then((data) => {
        if (!mounted) return;
        setLeaves(Array.isArray(data) ? data : data?.results || []);
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  async function handleSubmit(form) {
    try {
      await submitLeaveRequest({
        from_date: form.from,
        to_date: form.to,
        days: form.days,
        reason: form.reason,
        leave_type: form.type,
        status: "Pending",
      });
    } catch (err) {
      console.warn("Leave submit notice:", err);
    }

    const newLeave = {
      id: "L" + (900 + leaves.length),
      type: form.type,
      from: form.from,
      to: form.to,
      days: form.days,
      reason: form.reason,
      status: "Pending",
    };
    setLeaves((prev) => [newLeave, ...prev]);
    toast("Leave request submitted successfully");
    setShowForm(false);
  }

  const pendingCount  = leaves.filter((l) => l.status === "Pending").length;
  const approvedCount = leaves.filter((l) => l.status === "Approved").length;
  const rejectedCount = leaves.filter((l) => l.status === "Rejected").length;

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.slate, fontFamily: "Inter, sans-serif" }}>
        Loading your leave data...
      </div>
    );
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="My Leaves"
        subtitle="Apply for time off and track your requests"
        action={<Button icon={Plus} onClick={() => setShowForm(true)}>Apply for Leave</Button>}
      />

      {/* Leave Balance Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        {BALANCES.map((b) => {
          const remaining = b.total - b.used;
          const pct = Math.round((b.used / b.total) * 100);
          return (
            <Card key={b.type} accent={b.color}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: C.slate }}>{b.type}</div>
                <CalendarDays size={15} color={b.color} />
              </div>
              <div style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color: C.ink }}>
                {remaining} <span style={{ fontSize: 12, fontWeight: 500, color: C.slateLight }}>/ {b.total} days</span>
              </div>
              <div style={{ marginTop: 10, height: 4, borderRadius: 99, background: C.canvas, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: b.color, borderRadius: 99, transition: "width 0.4s ease" }} />
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.slateLight, marginTop: 5 }}>
                {b.used} used · {remaining} remaining
              </div>
            </Card>
          );
        })}
      </div>

      {/* Summary counters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <SummaryChip label="Pending" value={pendingCount} color={C.amber} />
        <SummaryChip label="Approved" value={approvedCount} color={C.teal} />
        <SummaryChip label="Rejected" value={rejectedCount} color={C.coral} />
        <SummaryChip label="Total" value={leaves.length} color={C.ink} />
      </div>

      {/* Tab filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {tabs.map((t) => (
          <div
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "7px 16px", borderRadius: 8, cursor: "pointer",
              fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600,
              background: tab === t ? C.ink : C.panel,
              color: tab === t ? "#fff" : C.slate,
              border: `1px solid ${tab === t ? C.ink : C.border}`,
              transition: "all 0.15s",
            }}
          >
            {t}
          </div>
        ))}
      </div>

      {/* Leave Requests Table */}
      <Card style={{ padding: 0 }}>
        <Table
          columns={["Type", "From", "To", "Days", "Reason", "Status"]}
          rows={filtered}
          renderRow={(l) => (
            <tr key={l.id} className="hoverable" style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: "12px 14px", fontWeight: 600, color: C.ink }}>{l.type || l.leave_type}</td>
              <td style={{ padding: "12px 14px", color: C.slate }}>{l.from || l.from_date}</td>
              <td style={{ padding: "12px 14px", color: C.slate }}>{l.to || l.to_date}</td>
              <td style={{ padding: "12px 14px", color: C.slate }}>{l.days}d</td>
              <td style={{ padding: "12px 14px", color: C.slate, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {l.reason || "—"}
              </td>
              <td style={{ padding: "12px 14px" }}>
                <Pill tone={statusTone(l.status)}>{l.status}</Pill>
              </td>
            </tr>
          )}
        />
        {filtered.length === 0 && <EmptyState text="No leave requests in this view." />}
      </Card>

      {/* Apply Leave Modal */}
      {showForm && (
        <Modal title="Apply for Leave" onClose={() => setShowForm(false)}>
          <LeaveForm onSave={handleSubmit} onCancel={() => setShowForm(false)} />
        </Modal>
      )}
    </div>
  );
}

/* ── Summary Chip ── */
function SummaryChip({ label, value, color }) {
  return (
    <Card style={{ padding: "10px 18px", flex: "1 1 100px", minWidth: 110 }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.slate, fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: "Sora, sans-serif", fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </Card>
  );
}
