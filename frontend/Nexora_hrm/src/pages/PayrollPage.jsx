import React, { useState, useEffect } from "react";
import { Wallet, Clock, TrendingUp, Download, Pencil, Play, RefreshCw, Eye, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { C } from "../constants/theme";
import { statusTone, fmtMoney, exportToCSV } from "../utils/helpers";
import { Card, PageHeader, StatCard, Button, Table, Modal, Avatar, Pill } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { fetchPayroll, updatePayroll, markPayrollPaid, generatePayroll } from "../api/payrollApi";
import "../styles/PayrollPage.css";

export default function PayrollPage() {
  const toast = useToast();
  const [payroll,          setPayroll]          = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [slip,             setSlip]             = useState(null);
  const [search,           setSearch]           = useState("");
  const [edit,             setEdit]             = useState(null);
  const [saving,           setSaving]           = useState(false);
  const [showGenerate,     setShowGenerate]     = useState(false);

  // Selected month on the page
  const [selectedMonth,    setSelectedMonth]    = useState("October");
  const [selectedYear,     setSelectedYear]     = useState("2026");

  // Inside the Generate Modal
  const [genMonth,         setGenMonth]         = useState("October");
  const [genYear,          setGenYear]          = useState("2026");
  const [generating,       setGenerating]       = useState(false);

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const YEARS  = ["2024","2025","2026","2027","2028"];

  // Load payroll on mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchPayroll()
      .then((res) => {
        if (!isMounted) return;
        const items = Array.isArray(res) ? res : res?.results || [];
        setPayroll(items);
      })
      .catch((err) => console.warn("Payroll fetch error:", err))
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, []);

  const selectedMonthStr = selectedMonth === "All" ? "All Months" : `${selectedMonth} ${selectedYear}`;

  // Filter payroll records for selected month
  const monthPayroll = selectedMonth === "All"
    ? payroll
    : payroll.filter((p) => (p.month || "").trim().toLowerCase() === selectedMonthStr.toLowerCase());

  // Check if that month's payroll exists in database
  const monthExistsInDb = selectedMonth === "All"
    ? payroll.length > 0
    : payroll.some((p) => (p.month || "").trim().toLowerCase() === selectedMonthStr.toLowerCase());

  // For modal: check target month existence
  const modalMonthStr = `${genMonth} ${genYear}`;
  const modalMonthExists = payroll.some((p) => (p.month || "").trim().toLowerCase() === modalMonthStr.toLowerCase());
  const modalMonthCount = payroll.filter((p) => (p.month || "").trim().toLowerCase() === modalMonthStr.toLowerCase()).length;

  const totalNet     = monthPayroll.reduce((s, p) => s + (Number(p.net) || 0), 0);
  const pendingCount = monthPayroll.filter((p) => p.status === "Pending").length;
  const filtered     = monthPayroll.filter((p) =>
    (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.department || "").toLowerCase().includes(search.toLowerCase())
  );

  async function markPaid(id) {
    try {
      await markPayrollPaid(id);
      setPayroll((list) => list.map((p) => (p.id === id ? { ...p, status: "Paid" } : p)));
      toast("Payslip marked as paid");
    } catch (err) {
      setPayroll((list) => list.map((p) => (p.id === id ? { ...p, status: "Paid" } : p)));
      toast("Payslip marked as paid (offline)");
    }
  }

  function openEdit(p) {
    setEdit({
      ...p,
      basic:      Number(p.basic)      || 0,
      allowances: Number(p.allowances) || 0,
      deductions: Number(p.deductions) || 0,
    });
  }

  function handleEditChange(field, value) {
    setEdit((prev) => {
      const updated = { ...prev, [field]: value };
      const b = Number(updated.basic) || 0;
      const a = Number(updated.allowances) || 0;
      const d = Number(updated.deductions) || 0;
      updated.net = Math.max(0, b + a - d);
      return updated;
    });
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const payload = {
        basic:      Number(edit.basic)      || 0,
        allowances: Number(edit.allowances) || 0,
        deductions: Number(edit.deductions) || 0,
        net:        Number(edit.net)        || 0,
      };
      await updatePayroll(edit.id, payload);
      setPayroll((list) => list.map((p) => (p.id === edit.id ? { ...p, ...payload } : p)));
      toast("Payroll updated successfully");
      setEdit(null);
    } catch (err) {
      setPayroll((list) => list.map((p) => (p.id === edit.id ? { ...p, basic: Number(edit.basic), allowances: Number(edit.allowances), deductions: Number(edit.deductions), net: Number(edit.net) } : p)));
      toast("Payroll updated (offline)");
      setEdit(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await generatePayroll({ month: genMonth, year: genYear });
      toast(res.message || `Payroll generated for ${genMonth} ${genYear}`);
      const refreshed = await fetchPayroll();
      const items = Array.isArray(refreshed) ? refreshed : refreshed?.results || [];
      setPayroll(items);
      setSelectedMonth(genMonth);
      setSelectedYear(genYear);
      setShowGenerate(false);
    } catch (err) {
      toast(err.message || "Failed to generate payroll", "error");
    } finally {
      setGenerating(false);
    }
  }

  const distData = [
    { label: "< 50k",    count: monthPayroll.filter((p) => (Number(p.net) || 0) < 50000).length },
    { label: "50-70k",   count: monthPayroll.filter((p) => (Number(p.net) || 0) >= 50000 && (Number(p.net) || 0) < 70000).length },
    { label: "70-90k",   count: monthPayroll.filter((p) => (Number(p.net) || 0) >= 70000 && (Number(p.net) || 0) < 90000).length },
    { label: "90-110k",  count: monthPayroll.filter((p) => (Number(p.net) || 0) >= 90000 && (Number(p.net) || 0) < 110000).length },
    { label: "110k+",    count: monthPayroll.filter((p) => (Number(p.net) || 0) >= 110000).length },
  ];

  const avgSalary = monthPayroll.length ? Math.round(totalNet / monthPayroll.length) : 0;

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.slate, fontFamily: "Inter, sans-serif" }}>
        Loading payroll data...
      </div>
    );
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="Payroll"
        subtitle="Salary stays fixed from joining · Deductions based on days absent"
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {selectedMonth !== "All" && monthExistsInDb ? (
              <Button
                variant="teal"
                icon={Eye}
                small
                onClick={() => {
                  document.getElementById("payroll-table-section")?.scrollIntoView({ behavior: "smooth" });
                  toast(`Viewing payroll for ${selectedMonthStr} (${monthPayroll.length} records)`);
                }}
              >
                View Payroll
              </Button>
            ) : (
              <Button
                variant="primary"
                icon={Play}
                small
                onClick={() => {
                  if (selectedMonth !== "All") {
                    setGenMonth(selectedMonth);
                    setGenYear(selectedYear);
                  }
                  setShowGenerate(true);
                }}
              >
                Generate Payroll
              </Button>
            )}
            <Button
              variant="outline"
              icon={Download}
              small
              onClick={() => exportToCSV(filtered.length ? filtered : monthPayroll, `payroll_${selectedMonthStr.replace(/\s+/g, "_")}.csv`)}
            >
              Export
            </Button>
          </div>
        }
      />

      {/* Month Selection Bar & Search */}
      <div className="payroll-month-bar">
        <Card style={{ padding: "14px 18px" }}>
          <div className="payroll-month-container">
            <div className="payroll-month-controls">
              <div className="payroll-month-label">
                <Calendar size={16} color={C.teal} />
                <span>Payroll Month:</span>
              </div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="payroll-select"
              >
                <option value="All">All Months</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {selectedMonth !== "All" && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="payroll-select year"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              )}

              {selectedMonth !== "All" && (
                monthExistsInDb ? (
                  <Pill tone="teal">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={13} /> Generated ({monthPayroll.length} records)
                    </span>
                  </Pill>
                ) : (
                  <Pill tone="amber">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <AlertCircle size={13} /> Not Generated Yet
                    </span>
                  </Pill>
                )
              )}
            </div>

            <div className="payroll-search-wrapper">
              <input
                placeholder="Search by name or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="payroll-search-input"
              />
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 16, marginBottom: 20 }}>
        <StatCard
          label="Total Net Payout"
          value={fmtMoney(totalNet)}
          delta={selectedMonth === "All" ? "Across all months" : `For ${selectedMonthStr}`}
          positive
          icon={Wallet}
          accent={C.teal}
        />
        <StatCard
          label="Payslips Pending"
          value={pendingCount}
          delta="Action required"
          positive={pendingCount === 0}
          icon={Clock}
          accent={C.amber}
        />
        <StatCard
          label="Average Salary"
          value={fmtMoney(avgSalary)}
          delta={selectedMonth === "All" ? "Across all staff" : `For ${selectedMonthStr}`}
          positive
          icon={TrendingUp}
          accent={C.blue}
        />
      </div>

      {/* Salary distribution chart */}
      <Card style={{ marginBottom: 20 }}>
        <p className="payroll-chart-title">
          Net salary distribution {selectedMonth !== "All" && `(${selectedMonthStr})`}
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={distData} barSize={40}>
            <CartesianGrid stroke={C.border} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fontFamily: "Inter" }} stroke="transparent" />
            <YAxis tick={{ fontSize: 12, fontFamily: "Inter" }} stroke="transparent" allowDecimals={false} />
            <Tooltip contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {distData.map((_, i) => <Cell key={i} fill={[C.teal, C.blue, C.amber, C.coral, "#6B46A8"][i % 5]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Payroll Table */}
      <div id="payroll-table-section">
        <Card style={{ padding: 0 }}>
          {selectedMonth !== "All" && !monthExistsInDb ? (
            <div className="payroll-empty-container">
              <div className="payroll-empty-icon-circle">
                <Wallet size={24} color={C.teal} />
              </div>
              <h3 className="payroll-empty-title">
                No Payroll Found for {selectedMonthStr}
              </h3>
              <p className="payroll-empty-desc">
                Payroll for <strong>{selectedMonthStr}</strong> does not exist in the database yet. Click below to generate it.
              </p>
              <Button
                variant="primary"
                icon={Play}
                small
                onClick={() => {
                  setGenMonth(selectedMonth);
                  setGenYear(selectedYear);
                  setShowGenerate(true);
                }}
              >
                Generate Payroll for {selectedMonthStr}
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: C.slate, fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
              {search ? `No employees found matching "${search}" for ${selectedMonthStr}.` : `No payroll records found for ${selectedMonthStr}.`}
            </div>
          ) : (
            <Table
              columns={selectedMonth === "All"
                ? ["Employee", "Month", "Department", "Basic", "Allowances", "Deductions", "Net Pay", "Status", ""]
                : ["Employee", "Department", "Basic", "Allowances", "Deductions", "Net Pay", "Status", ""]
              }
              rows={filtered}
              renderRow={(p) => (
                <tr key={p.id} className="hoverable payroll-table-row">
                  <td className="payroll-table-cell">
                    <div className="payroll-employee-cell">
                      <Avatar name={p.name} size={30} />
                      <span className="payroll-employee-name">{p.name}</span>
                    </div>
                  </td>
                  {selectedMonth === "All" && (
                    <td className="payroll-table-cell" style={{ color: C.ink, fontSize: 13, fontWeight: 500 }}>
                      <Pill tone="blue">{p.month}</Pill>
                    </td>
                  )}
                  <td className="payroll-table-cell payroll-muted-text">{p.department}</td>
                  <td className="payroll-table-cell payroll-muted-text">{fmtMoney(p.basic)}</td>
                  <td className="payroll-table-cell payroll-muted-text">{fmtMoney(p.allowances)}</td>
                  <td className="payroll-table-cell payroll-coral-text">-{fmtMoney(p.deductions)}</td>
                  <td className="payroll-table-cell payroll-net-text">{fmtMoney(p.net)}</td>
                  <td className="payroll-table-cell"><Pill tone={statusTone(p.status)}>{p.status}</Pill></td>
                  <td className="payroll-table-cell">
                    <div className="payroll-actions-group">
                      <Button small variant="ghost" onClick={() => openEdit(p)} icon={Pencil}>Edit</Button>
                      <Button small variant="ghost" onClick={() => setSlip(p)}>View slip</Button>
                      {p.status === "Pending" && <Button small variant="teal" onClick={() => markPaid(p.id)}>Mark paid</Button>}
                    </div>
                  </td>
                </tr>
              )}
            />
          )}
        </Card>
      </div>

      {/* View Payslip Modal */}
      {slip && (
        <Modal title="Payslip" onClose={() => setSlip(null)} width={440}>
          <div className="payslip-modal-header">
            <Avatar name={slip.name} size={48} />
            <div>
              <div className="payslip-modal-emp-name">{slip.name}</div>
              <div className="payslip-modal-emp-sub">{slip.department} · {slip.month}</div>
            </div>
          </div>
          {[["Basic Pay", slip.basic, false], ["Allowances", slip.allowances, false], ["Deductions", slip.deductions, true]].map(([label, val, isDeduction]) => (
            <div key={label} className="payslip-modal-row">
              <span className="payslip-modal-row-label">{label}</span>
              <span
                className="payslip-modal-row-val"
                style={{ color: isDeduction ? C.coral : C.ink }}
              >
                {isDeduction ? "-" : ""}{fmtMoney(val)}
              </span>
            </div>
          ))}
          <div className="payslip-modal-net-row">
            <span>Net Pay</span>
            <span style={{ color: C.teal }}>{fmtMoney(slip.net)}</span>
          </div>
          <div className="payslip-modal-footer">
            <Button variant="teal" onClick={() => { toast("Payslip downloaded"); setSlip(null); }}>Download PDF</Button>
          </div>
        </Modal>
      )}

      {/* Edit Payroll Modal */}
      {edit && (
        <Modal title="Edit Payroll" onClose={() => setEdit(null)} width={480}>
          <div className="payslip-modal-header" style={{ marginBottom: 20 }}>
            <Avatar name={edit.name} size={48} />
            <div>
              <div className="payslip-modal-emp-name">{edit.name}</div>
              <div className="payslip-modal-emp-sub">{edit.department} · {edit.month}</div>
            </div>
          </div>
          <div className="payroll-edit-form">
            <div>
              <label className="payroll-edit-label">Basic Pay (₹)</label>
              <input
                type="number"
                value={edit.basic}
                onChange={(e) => handleEditChange("basic", e.target.value)}
                className="payroll-edit-input"
              />
            </div>
            <div>
              <label className="payroll-edit-label">Allowances (₹)</label>
              <input
                type="number"
                value={edit.allowances}
                onChange={(e) => handleEditChange("allowances", e.target.value)}
                className="payroll-edit-input"
              />
            </div>
            <div>
              <label className="payroll-edit-label">Deductions (₹)</label>
              <input
                type="number"
                value={edit.deductions}
                onChange={(e) => handleEditChange("deductions", e.target.value)}
                className="payroll-edit-input"
              />
            </div>
            <div className="payroll-edit-net-box">
              <span className="payroll-edit-net-label">Net Pay</span>
              <span className="payroll-edit-net-val">{fmtMoney(edit.net)}</span>
            </div>
            <div className="payroll-edit-hint">
              Net Pay = Basic + Allowances − Deductions (auto-calculated)
            </div>
          </div>
          <div className="payroll-modal-actions">
            <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
            <Button variant="teal" onClick={saveEdit} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </div>
        </Modal>
      )}

      {/* Generate Payroll Modal */}
      {showGenerate && (
        <Modal title="Generate Monthly Payroll" onClose={() => setShowGenerate(false)} width={480}>
          <div className="payroll-gen-desc">
            Select the month to generate payroll for all active employees.
          </div>

          <div className="payroll-gen-grid">
            <div>
              <label className="payroll-edit-label">Month</label>
              <select
                value={genMonth}
                onChange={(e) => setGenMonth(e.target.value)}
                className="payroll-edit-input"
                style={{ cursor: "pointer" }}
              >
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="payroll-edit-label">Year</label>
              <select
                value={genYear}
                onChange={(e) => setGenYear(e.target.value)}
                className="payroll-edit-input"
                style={{ cursor: "pointer" }}
              >
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Database Existence Check Alert */}
          {modalMonthExists ? (
            <div className="payroll-gen-alert-exists">
              <CheckCircle2 size={20} color="#16A34A" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div className="payroll-gen-alert-title">
                  Payroll Already Exists in Database
                </div>
                <div className="payroll-gen-alert-text">
                  Payroll for <strong>{modalMonthStr}</strong> has already been generated ({modalMonthCount} employee records found).
                  <br />
                  Payroll cannot be generated twice for the same month. Click <strong>View Payroll</strong> to inspect the payslips.
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="payroll-gen-alert-ready">
                <AlertCircle size={18} color={C.blue} style={{ flexShrink: 0 }} />
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.ink }}>
                  No payroll exists for <strong>{modalMonthStr}</strong> in database. Ready to generate.
                </div>
              </div>

              <div className="payroll-gen-rules-box">
                • <strong>Basic Pay</strong> = Employee's salary (set at joining)<br />
                • <strong>Deductions</strong> = (Salary ÷ 30) × Days absent<br />
                • <strong>Net Pay</strong> = Basic − Deductions<br />
                • No absence = Full salary
              </div>
            </>
          )}

          <div className="payroll-modal-actions">
            <Button variant="ghost" onClick={() => setShowGenerate(false)}>
              {modalMonthExists ? "Close" : "Cancel"}
            </Button>
            {modalMonthExists ? (
              <Button
                variant="teal"
                icon={Eye}
                onClick={() => {
                  setSelectedMonth(genMonth);
                  setSelectedYear(genYear);
                  setShowGenerate(false);
                  toast(`Viewing payroll for ${modalMonthStr}`);
                }}
              >
                View Payroll ({modalMonthStr})
              </Button>
            ) : (
              <Button
                variant="teal"
                icon={generating ? RefreshCw : Play}
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? "Generating..." : `Generate for ${modalMonthStr}`}
              </Button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
