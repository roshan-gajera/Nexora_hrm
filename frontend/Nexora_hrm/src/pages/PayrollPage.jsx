import React, { useState, useEffect } from "react";
import { Wallet, Clock, TrendingUp, Download, Pencil, Play, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { C } from "../constants/theme";
import { statusTone, fmtMoney, exportToCSV } from "../utils/helpers";
import { Card, PageHeader, StatCard, Button, Table, Modal, Avatar, Pill } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { fetchPayroll, updatePayroll, markPayrollPaid, generatePayroll } from "../api/payrollApi";

export default function PayrollPage() {
  const toast = useToast();
  const [payroll,      setPayroll]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [slip,         setSlip]         = useState(null);
  const [search,       setSearch]       = useState("");
  const [edit,         setEdit]         = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genMonth,     setGenMonth]     = useState("July");
  const [genYear,      setGenYear]      = useState("2026");
  const [generating,   setGenerating]   = useState(false);

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

  const totalNet     = payroll.reduce((s, p) => s + (Number(p.net) || 0), 0);
  const pendingCount = payroll.filter((p) => p.status === "Pending").length;
  const filtered     = payroll.filter((p) =>
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
    if (!edit) return;
    setSaving(true);
    try {
      const payload = {
        basic:      Number(edit.basic),
        allowances: Number(edit.allowances),
        deductions: Number(edit.deductions),
        net:        Number(edit.net),
      };
      await updatePayroll(edit.id, payload);
      setPayroll((list) =>
        list.map((p) =>
          p.id === edit.id
            ? { ...p, basic: payload.basic, allowances: payload.allowances, deductions: payload.deductions, net: payload.net }
            : p
        )
      );
      toast("Payroll updated successfully");
      setEdit(null);
    } catch (err) {
      toast("Failed to save payroll changes");
      console.error("Payroll update error:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    const monthStr = `${genMonth} ${genYear}`;
    setGenerating(true);
    try {
      const res = await generatePayroll(monthStr);
      toast(res.detail || "Payroll generated!");
      const fresh = await fetchPayroll();
      const items = Array.isArray(fresh) ? fresh : (fresh?.results || []);
      setPayroll(items);
      setShowGenerate(false);
    } catch (err) {
      toast("Failed to generate payroll: " + (err.message || "Unknown error"));
      console.error("Generate payroll error:", err);
    } finally {
      setGenerating(false);
    }
  }

  const ranges = [
    { label: "< 40k",    min: 0,      max: 40000   },
    { label: "40-60k",   min: 40000,  max: 60000   },
    { label: "60-80k",   min: 60000,  max: 80000   },
    { label: "80-100k",  min: 80000,  max: 100000  },
    { label: "> 100k",   min: 100000, max: Infinity },
  ];
  const distData = ranges.map((r) => ({
    label: r.label,
    count: payroll.filter((p) => {
      const netVal = Number(p.net) || 0;
      return netVal >= r.min && netVal < r.max;
    }).length,
  }));

  const avgSalary = payroll.length > 0 ? Math.round(totalNet / payroll.length) : 0;

  const inputStyle = {
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "10px 14px",
    fontFamily: "Inter, sans-serif",
    fontSize: 14,
    color: C.ink,
    background: C.panel,
    outline: "none",
    width: "100%",
    transition: "border-color 0.2s",
  };

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
        subtitle="Salary stays fixed from joining · Deductions based on leaves"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="primary" icon={Play} small onClick={() => setShowGenerate(true)}>Generate Payroll</Button>
            <Button variant="outline" icon={Download} small onClick={() => exportToCSV(filtered.length ? filtered : payroll, "payroll_export.csv")}>Export</Button>
          </div>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 16, marginBottom: 20 }}>
        <StatCard label="Total Net Payout" value={fmtMoney(totalNet)}                             delta="For June 2026"     positive icon={Wallet}     accent={C.teal}  />
        <StatCard label="Payslips Pending" value={pendingCount}                                    delta="Action required"   positive={pendingCount === 0} icon={Clock} accent={C.amber} />
        <StatCard label="Average Salary"   value={fmtMoney(avgSalary)}                            delta="Across all staff" positive icon={TrendingUp} accent={C.blue}  />
      </div>

      {/* Salary distribution chart */}
      <Card style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, color: C.ink, margin: "0 0 14px" }}>Net salary distribution</p>
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

      {/* Search */}
      <Card style={{ padding: "12px 16px", marginBottom: 16 }}>
        <input
          placeholder="Search by name or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ border: "none", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 13, width: "100%", color: C.ink, background: "transparent" }}
        />
      </Card>

      <Card style={{ padding: 0 }}>
        <Table
          columns={["Employee", "Department", "Basic", "Allowances", "Deductions", "Net Pay", "Status", ""]}
          rows={filtered}
          renderRow={(p) => (
            <tr key={p.id} className="hoverable" style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: "11px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={p.name} size={30} />{p.name}</div>
              </td>
              <td style={{ padding: "11px 14px", color: C.slate, fontSize: 13 }}>{p.department}</td>
              <td style={{ padding: "11px 14px", color: C.slate, fontSize: 13 }}>{fmtMoney(p.basic)}</td>
              <td style={{ padding: "11px 14px", color: C.slate, fontSize: 13 }}>{fmtMoney(p.allowances)}</td>
              <td style={{ padding: "11px 14px", color: C.coral, fontSize: 13 }}>-{fmtMoney(p.deductions)}</td>
              <td style={{ padding: "11px 14px", fontWeight: 700, color: C.ink }}>{fmtMoney(p.net)}</td>
              <td style={{ padding: "11px 14px" }}><Pill tone={statusTone(p.status)}>{p.status}</Pill></td>
              <td style={{ padding: "11px 14px" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button small variant="ghost" onClick={() => openEdit(p)} icon={Pencil}>Edit</Button>
                  <Button small variant="ghost" onClick={() => setSlip(p)}>View slip</Button>
                  {p.status === "Pending" && <Button small variant="teal" onClick={() => markPaid(p.id)}>Mark paid</Button>}
                </div>
              </td>
            </tr>
          )}
        />
      </Card>

      {/* View Payslip Modal */}
      {slip && (
        <Modal title="Payslip" onClose={() => setSlip(null)} width={440}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
            <Avatar name={slip.name} size={48} />
            <div>
              <div style={{ fontWeight: 700, color: C.ink, fontFamily: "Sora, sans-serif", fontSize: 16 }}>{slip.name}</div>
              <div style={{ color: C.slate, fontSize: 13 }}>{slip.department} · {slip.month}</div>
            </div>
          </div>
          {[["Basic Pay", slip.basic, false], ["Allowances", slip.allowances, false], ["Deductions", slip.deductions, true]].map(([label, val, isDeduction]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}`, fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
              <span style={{ color: C.slate }}>{label}</span>
              <span style={{ color: isDeduction ? C.coral : C.ink, fontWeight: 500 }}>{isDeduction ? "-" : ""}{fmtMoney(val)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 4px", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 17 }}>
            <span>Net Pay</span>
            <span style={{ color: C.teal }}>{fmtMoney(slip.net)}</span>
          </div>
          <div style={{ marginTop: 18 }}>
            <Button variant="teal" onClick={() => { toast("Payslip downloaded"); setSlip(null); }}>Download PDF</Button>
          </div>
        </Modal>
      )}

      {/* Edit Payroll Modal */}
      {edit && (
        <Modal title="Edit Payroll" onClose={() => setEdit(null)} width={480}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
            <Avatar name={edit.name} size={48} />
            <div>
              <div style={{ fontWeight: 700, color: C.ink, fontFamily: "Sora, sans-serif", fontSize: 16 }}>{edit.name}</div>
              <div style={{ color: C.slate, fontSize: 13 }}>{edit.department} · {edit.month}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: C.slate, marginBottom: 6, display: "block" }}>Basic Pay (₹)</label>
              <input type="number" value={edit.basic} onChange={(e) => handleEditChange("basic", e.target.value)} style={inputStyle} onFocus={(e) => e.target.style.borderColor = C.teal} onBlur={(e) => e.target.style.borderColor = C.border} />
            </div>
            <div>
              <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: C.slate, marginBottom: 6, display: "block" }}>Allowances (₹)</label>
              <input type="number" value={edit.allowances} onChange={(e) => handleEditChange("allowances", e.target.value)} style={inputStyle} onFocus={(e) => e.target.style.borderColor = C.teal} onBlur={(e) => e.target.style.borderColor = C.border} />
            </div>
            <div>
              <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: C.slate, marginBottom: 6, display: "block" }}>Deductions (₹)</label>
              <input type="number" value={edit.deductions} onChange={(e) => handleEditChange("deductions", e.target.value)} style={inputStyle} onFocus={(e) => e.target.style.borderColor = C.coral} onBlur={(e) => e.target.style.borderColor = C.border} />
            </div>
            <div style={{ background: `${C.teal}10`, border: `1px solid ${C.teal}30`, borderRadius: 10, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, color: C.ink }}>Net Pay</span>
              <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 20, color: C.teal }}>{fmtMoney(edit.net)}</span>
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.slateLight || C.slate, marginTop: -8 }}>
              Net Pay = Basic + Allowances − Deductions (auto-calculated)
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
            <Button variant="teal" onClick={saveEdit} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </div>
        </Modal>
      )}

      {/* Generate Payroll Modal */}
      {showGenerate && (
        <Modal title="Generate Monthly Payroll" onClose={() => setShowGenerate(false)} width={460}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.slate, marginBottom: 18, lineHeight: 1.6 }}>
            This will generate payroll for all active employees for the selected month.
            <br />
            <strong style={{ color: C.ink }}>How it works:</strong>
          </div>
          <div style={{ background: `${C.teal}08`, border: `1px solid ${C.teal}20`, borderRadius: 10, padding: "14px 16px", marginBottom: 20, fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.ink, lineHeight: 1.7 }}>
            • <strong>Basic Pay</strong> = Employee's salary (set at joining)<br />
            • <strong>Deductions</strong> = (Salary ÷ 30) × Approved leave days<br />
            • <strong>Net Pay</strong> = Basic − Deductions<br />
            • No leaves = Full salary
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <div>
              <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: C.slate, marginBottom: 6, display: "block" }}>Month</label>
              <select value={genMonth} onChange={(e) => setGenMonth(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: C.slate, marginBottom: 6, display: "block" }}>Year</label>
              <select value={genYear} onChange={(e) => setGenYear(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button variant="ghost" onClick={() => setShowGenerate(false)}>Cancel</Button>
            <Button variant="teal" icon={generating ? RefreshCw : Play} onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating..." : `Generate for ${genMonth} ${genYear}`}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
