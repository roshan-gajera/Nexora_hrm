import React, { useState, useEffect } from "react";
import { Download, Wallet, FileText, Eye, Calendar } from "lucide-react";
import { C } from "../constants/theme";
import { fmtMoney, statusTone } from "../utils/helpers";
import { Card, PageHeader, Button, Table, Modal, Pill, EmptyState } from "../components/ui";
import { fetchMyPayslips } from "../api/employeePortalApi";

export default function EmpPayslipsPage() {
  const [payslips, setPayslips] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [detail,   setDetail]   = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchMyPayslips()
      .then((data) => {
        if (!mounted) return;
        setPayslips(Array.isArray(data) ? data : data?.results || []);
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const totalEarned = payslips
    .filter((p) => p.status === "Paid")
    .reduce((sum, p) => sum + (p.net || p.net_salary || 0), 0);

  const latestPayslip  = payslips.length > 0 ? payslips[0] : null;
  const paidCount      = payslips.filter((p) => p.status === "Paid").length;
  const pendingCount   = payslips.filter((p) => p.status === "Pending").length;

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.slate, fontFamily: "Inter, sans-serif" }}>
        Loading your payslips...
      </div>
    );
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="My Payslips"
        subtitle="View and download your salary statements"
      />

      {/* Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Card accent={C.teal} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.slate, fontWeight: 600 }}>Total Earned (YTD)</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.tealSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Wallet size={16} color={C.teal} />
            </div>
          </div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: C.ink }}>{fmtMoney(totalEarned)}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.teal, fontWeight: 600 }}>
            {paidCount} payslips processed
          </div>
        </Card>

        <Card accent={C.blue} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.slate, fontWeight: 600 }}>Latest Payslip</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.blueSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={16} color={C.blue} />
            </div>
          </div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: C.ink }}>
            {latestPayslip ? fmtMoney(latestPayslip.net || latestPayslip.net_salary || 0) : "—"}
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.blue, fontWeight: 600 }}>
            {latestPayslip?.month || "No data"}
          </div>
        </Card>

        <Card accent={C.amber} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.slate, fontWeight: 600 }}>Pending</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.amberSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Calendar size={16} color={C.amber} />
            </div>
          </div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: C.ink }}>{pendingCount}</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: C.amber, fontWeight: 600 }}>
            {pendingCount === 0 ? "All clear" : "Awaiting processing"}
          </div>
        </Card>
      </div>

      {/* Payslips Table */}
      <Card style={{ padding: 0 }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, color: C.ink }}>Salary Statements</span>
          <Pill tone="slate">{payslips.length} total</Pill>
        </div>

        <Table
          columns={["Month", "Basic", "Allowances", "Deductions", "Net Salary", "Status", "Actions"]}
          rows={payslips}
          renderRow={(p) => (
            <tr key={p.id} className="hoverable" style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: C.blueSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Calendar size={14} color={C.blue} />
                  </div>
                  <span style={{ fontWeight: 600, color: C.ink }}>{p.month}</span>
                </div>
              </td>
              <td style={{ padding: "12px 14px", color: C.slate }}>{fmtMoney(p.basic || 0)}</td>
              <td style={{ padding: "12px 14px", color: C.teal }}>{fmtMoney(p.allowances || 0)}</td>
              <td style={{ padding: "12px 14px", color: C.coral }}>{fmtMoney(p.deductions || 0)}</td>
              <td style={{ padding: "12px 14px" }}>
                <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, color: C.ink }}>
                  {fmtMoney(p.net || p.net_salary || 0)}
                </span>
              </td>
              <td style={{ padding: "12px 14px" }}>
                <Pill tone={statusTone(p.status)}>{p.status}</Pill>
              </td>
              <td style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <div
                    title="View Details"
                    onClick={() => setDetail(p)}
                    style={{ width: 30, height: 30, borderRadius: 7, background: C.blueSoft, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    <Eye size={14} color={C.blue} />
                  </div>
                  <div
                    title="Download"
                    style={{ width: 30, height: 30, borderRadius: 7, background: C.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    <Download size={14} color={C.teal} />
                  </div>
                </div>
              </td>
            </tr>
          )}
        />
        {payslips.length === 0 && <EmptyState text="No payslips available yet. They'll appear here once processed." />}
      </Card>

      {/* Payslip Detail Modal */}
      {detail && (
        <Modal title={`Payslip — ${detail.month}`} onClose={() => setDetail(null)} width={520}>
          <PayslipDetail payslip={detail} />
        </Modal>
      )}
    </div>
  );
}

/* ── Payslip Detail ── */
function PayslipDetail({ payslip }) {
  const rows = [
    { label: "Basic Salary",  value: payslip.basic || 0,       type: "earning"   },
    { label: "Allowances",    value: payslip.allowances || 0,   type: "earning"   },
    { label: "Deductions",    value: payslip.deductions || 0,   type: "deduction" },
  ];

  const totalEarnings   = (payslip.basic || 0) + (payslip.allowances || 0);
  const totalDeductions = payslip.deductions || 0;
  const netPay          = payslip.net || payslip.net_salary || totalEarnings - totalDeductions;

  return (
    <div>
      {/* Header info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <InfoRow label="Month" value={payslip.month} />
        <InfoRow label="Status" value={<Pill tone={statusTone(payslip.status)}>{payslip.status}</Pill>} />
        <InfoRow label="Department" value={payslip.department || "—"} />
        <InfoRow label="Employee" value={payslip.name || "—"} />
      </div>

      {/* Breakdown */}
      <div style={{ background: C.canvas, borderRadius: 10, padding: 18, marginBottom: 16 }}>
        <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13, color: C.ink, margin: "0 0 12px" }}>Salary Breakdown</p>
        {rows.map((r) => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.slate }}>{r.label}</span>
            <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 13, fontWeight: 600, color: r.type === "deduction" ? C.coral : C.teal }}>
              {r.type === "deduction" ? "−" : "+"}{fmtMoney(r.value)}
            </span>
          </div>
        ))}
      </div>

      {/* Net Pay */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 18px", borderRadius: 10,
        background: `linear-gradient(135deg, ${C.ink} 0%, #1E2E52 100%)`,
      }}>
        <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,0.8)" }}>Net Pay</span>
        <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 22, color: "#fff" }}>{fmtMoney(netPay)}</span>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.slateLight, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: C.ink, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
