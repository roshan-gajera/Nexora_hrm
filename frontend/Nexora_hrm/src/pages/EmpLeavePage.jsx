import React, { useState, useEffect } from "react";
import { Plus, CalendarDays } from "lucide-react";
import { C } from "../constants/theme";
import { statusTone } from "../utils/helpers";
import { Card, PageHeader, Button, Input, Select, Table, Modal, Pill, EmptyState } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { fetchMyLeaves, submitLeaveRequest } from "../api/employeePortalApi";
import "../styles/EmpLeavePage.css";

const LEAVE_TYPES = ["Sick Leave", "Casual Leave", "Earned Leave", "Unpaid Leave"];

const BASE_BALANCES = [
  { type: "Casual Leave",  total: 8, color: C.blue  },
  { type: "Sick Leave",    total: 8, color: C.coral },
  { type: "Earned Leave",  total: 15, color: C.teal  },
  { type: "Unpaid Leave",  total: 5,  color: C.amber },
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
      <div className="emp-leave-form-grid">
        <Input label="From" type="date" value={form.from} onChange={(e) => set("from", e.target.value)} />
        <Input label="To" type="date" value={form.to} onChange={(e) => set("to", e.target.value)} />
      </div>

      {/* Days preview */}
      <div className="emp-leave-days-preview">
        <CalendarDays size={14} color={C.blue} />
        <span>
          {days} day{days > 1 ? "s" : ""} requested
        </span>
      </div>

      <Input label="Reason" value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Brief reason for leave..." />

      <div className="emp-leave-form-actions">
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
      const res = await submitLeaveRequest({
        from_date: form.from,
        to_date: form.to,
        days: form.days,
        reason: form.reason,
        leave_type: form.type,
        status: "Pending",
      });
      const newLeave = {
        id: res.id,
        type: res.leave_type_name || form.type,
        from: res.from_date || form.from,
        to: res.to_date || form.to,
        days: res.days || form.days,
        reason: res.reason || form.reason,
        status: res.status || "Pending",
      };
      setLeaves((prev) => [newLeave, ...prev]);
      toast("Leave request submitted to Admin successfully", "success");
      setShowForm(false);
    } catch (err) {
      console.error("Leave submit notice:", err);
      toast("Failed to submit leave request", "error");
    }
  }

  const pendingCount  = leaves.filter((l) => l.status === "Pending").length;
  const approvedCount = leaves.filter((l) => l.status === "Approved").length;
  const rejectedCount = leaves.filter((l) => l.status === "Rejected").length;

  const balances = BASE_BALANCES.map((b) => {
    const used = leaves
      .filter((l) => (l.type || l.leave_type) === b.type && l.status === "Approved")
      .reduce((sum, l) => sum + (Number(l.days) || 0), 0);
    return { ...b, used };
  });

  if (loading) {
    return (
      <div className="emp-leave-loading">
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
      <div className="emp-leave-balance-grid">
        {balances.map((b) => {
          const remaining = b.total - b.used;
          const pct = Math.round((b.used / b.total) * 100);
          return (
            <Card key={b.type} accent={b.color}>
              <div className="emp-leave-balance-header">
                <div className="emp-leave-balance-type">{b.type}</div>
                <CalendarDays size={15} color={b.color} />
              </div>
              <div className="emp-leave-balance-val">
                {remaining} <span className="emp-leave-balance-total">/ {b.total} days</span>
              </div>
              <div className="emp-leave-progress-track">
                <div
                  className="emp-leave-progress-fill"
                  style={{ width: `${pct}%`, background: b.color }}
                />
              </div>
              <div className="emp-leave-balance-sub">
                {b.used} used · {remaining} remaining
              </div>
            </Card>
          );
        })}
      </div>

      {/* Summary counters */}
      <div className="emp-leave-summary-row">
        <SummaryChip label="Pending" value={pendingCount} color={C.amber} />
        <SummaryChip label="Approved" value={approvedCount} color={C.teal} />
        <SummaryChip label="Rejected" value={rejectedCount} color={C.coral} />
        <SummaryChip label="Total" value={leaves.length} color={C.ink} />
      </div>

      {/* Tab filter */}
      <div className="emp-leave-tabs">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`emp-leave-tab-btn ${tab === t ? "active" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Leave Requests Table */}
      <div className="emp-leave-table-card">
        <Card style={{ padding: 0 }}>
          <Table
            columns={["Type", "From", "To", "Days", "Reason", "Status"]}
            rows={filtered}
            renderRow={(l) => (
              <tr key={l.id} className="hoverable emp-leave-table-row">
                <td className="emp-leave-table-cell title">{l.type || l.leave_type}</td>
                <td className="emp-leave-table-cell muted">{l.from || l.from_date}</td>
                <td className="emp-leave-table-cell muted">{l.to || l.to_date}</td>
                <td className="emp-leave-table-cell muted">{l.days}d</td>
                <td className="emp-leave-table-cell muted emp-leave-reason-cell">
                  {l.reason || "—"}
                </td>
                <td className="emp-leave-table-cell">
                  <Pill tone={statusTone(l.status)}>{l.status}</Pill>
                </td>
              </tr>
            )}
          />
          {filtered.length === 0 && <EmptyState text="No leave requests in this view." />}
        </Card>
      </div>

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
    <div className="emp-leave-chip">
      <Card>
        <div className="emp-leave-chip-label">{label}</div>
        <div className="emp-leave-chip-val" style={{ color }}>{value}</div>
      </Card>
    </div>
  );
}
