import React, { useState, useEffect } from "react";
import { Check, XCircle } from "lucide-react";
import { statusTone } from "../utils/helpers";
import { Card, Button, Input, Select, Table, Modal, Avatar, Pill, EmptyState } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { fetchLeaves, createLeaveRequest, updateLeaveStatus } from "../api/leavesApi";
import { fetchEmployees } from "../api/employeesApi";
import "../styles/LeavePage.css";

const LEAVE_TYPES = ["Sick Leave", "Casual Leave", "Earned Leave", "Unpaid Leave"];

function LeaveForm({ employees, onSave, onCancel }) {
  const [form, setForm] = useState({ employeeId: employees[0]?.id, type: "Casual Leave", from: "2026-07-15", to: "2026-07-16", reason: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
      <Select label="Employee" value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} options={employees.map((e) => e.id)} />
      <Select label="Leave type" value={form.type} onChange={(e) => set("type", e.target.value)} options={LEAVE_TYPES} />
      <div className="leave-form-grid">
        <Input label="From" type="date" value={form.from} onChange={(e) => set("from", e.target.value)} />
        <Input label="To" type="date" value={form.to} onChange={(e) => set("to", e.target.value)} />
      </div>
      <Input label="Reason" value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Brief reason for leave" />
      <div className="leave-form-actions">
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
  const rejectedCount = leaves.filter((l) => l.status === "Rejected").length;

  if (loading) {
    return (
      <div className="leave-loading">
        Loading leave data...
      </div>
    );
  }

  return (
    <div className="page-enter">
      {/* Summary row */}
      <div className="leave-stats-row">
        <div className="leave-stat-card">
          <Card>
            <div className="leave-stat-label">Total requests</div>
            <div className="leave-stat-val">{leaves.length}</div>
          </Card>
        </div>
        <div className="leave-stat-card">
          <Card>
            <div className="leave-stat-label">Approved this month</div>
            <div className="leave-stat-val teal">{approvedCount}</div>
          </Card>
        </div>
        <div className="leave-stat-card">
          <Card>
            <div className="leave-stat-label">Rejected this month</div>
            <div className="leave-stat-val coral">{rejectedCount}</div>
          </Card>
        </div>
        <div className="leave-stat-card">
          <Card>
            <div className="leave-stat-label">Pending</div>
            <div className="leave-stat-val amber">{pendingCount}</div>
          </Card>
        </div>
      </div>

      {/* Tab filter */}
      <div className="leave-tabs">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`leave-tab-btn ${tab === t ? "active" : ""}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="leave-table-card">
        <Card style={{ padding: 0 }}>
          <Table
            columns={["Employee", "Type", "From", "To", "Days", "Reason", "Status", "Actions"]}
            rows={filtered}
            renderRow={(l) => (
              <tr key={l.id} className="hoverable leave-table-row">
                <td className="leave-table-cell">
                  <div className="leave-employee-cell"><Avatar name={l.name} size={28} />{l.name}</div>
                </td>
                <td className="leave-table-cell muted">{l.type}</td>
                <td className="leave-table-cell muted">{l.from}</td>
                <td className="leave-table-cell muted">{l.to}</td>
                <td className="leave-table-cell muted">{l.days}d</td>
                <td className="leave-table-cell muted leave-reason-cell">{l.reason}</td>
                <td className="leave-table-cell"><Pill tone={statusTone(l.status)}>{l.status}</Pill></td>
                <td className="leave-table-cell">
                  {l.status === "Pending" ? (
                    <div className="leave-action-btns">
                      <button
                        type="button"
                        title="Approve"
                        className="leave-action-btn approve"
                        onClick={() => updateStatus(l.id, "Approved")}
                      >
                        <Check size={14} color="#1F8A70" />
                      </button>
                      <button
                        type="button"
                        title="Reject"
                        className="leave-action-btn reject"
                        onClick={() => updateStatus(l.id, "Rejected")}
                      >
                        <XCircle size={14} color="#C4432F" />
                      </button>
                    </div>
                  ) : <span className="leave-action-empty">—</span>}
                </td>
              </tr>
            )}
          />
          {filtered.length === 0 && <EmptyState text="No leave requests in this view." />}
        </Card>
      </div>

      {showForm && (
        <Modal title="Apply for leave" onClose={() => setShowForm(false)}>
          <LeaveForm employees={employees} onSave={addLeave} onCancel={() => setShowForm(false)} />
        </Modal>
      )}
    </div>
  );
}
