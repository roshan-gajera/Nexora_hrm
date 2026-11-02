import React, { useState, useEffect } from "react";
import { Download, Wallet, FileText, Eye, Calendar, RefreshCw } from "lucide-react";
import { C } from "../constants/theme";
import { fmtMoney, statusTone } from "../utils/helpers";
import { Card, PageHeader, Button, Table, Modal, Pill, EmptyState } from "../components/ui";
import { fetchMyPayslips } from "../api/employeePortalApi";
import "../styles/EmpPayslipsPage.css";

export default function EmpPayslipsPage() {
  const [payslips, setPayslips] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detail,   setDetail]   = useState(null);

  const loadData = () => {
    return fetchMyPayslips()
      .then((data) => {
        setPayslips(Array.isArray(data) ? data : data?.results || []);
      })
      .catch((err) => console.warn("Fetch payslips err:", err));
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadData().finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  function downloadPayslip(p) {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      `Employee Payslip - ${p.month}\n` +
      `Employee,${p.name || ""}\n` +
      `Employee ID,${p.employeeId || ""}\n` +
      `Department,${p.department || ""}\n` +
      `Month,${p.month}\n` +
      `Basic Salary,${p.basic || 0}\n` +
      `Allowances,${p.allowances || 0}\n` +
      `Deductions,${p.deductions || 0}\n` +
      `Net Salary,${p.net || p.net_salary || 0}\n` +
      `Status,${p.status}\n`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Payslip_${(p.name || "Employee").replace(/\s+/g, "_")}_${(p.month || "Month").replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const totalEarned = payslips
    .filter((p) => p.status === "Paid")
    .reduce((sum, p) => sum + (p.net || p.net_salary || 0), 0);

  const latestPayslip  = payslips.length > 0 ? payslips[0] : null;
  const paidCount      = payslips.filter((p) => p.status === "Paid").length;
  const pendingCount   = payslips.filter((p) => p.status === "Pending").length;

  if (loading) {
    return (
      <div className="emp-payslips-loading">
        Loading your payslips...
      </div>
    );
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="My Payslips"
        subtitle="View and download your salary statements"
        action={
          <Button variant="outline" icon={RefreshCw} onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        }
      />

      {/* Overview Cards */}
      <div className="emp-payslips-overview-grid">
        <Card accent={C.teal}>
          <div className="emp-payslips-card-body">
            <div className="emp-payslips-card-header">
              <span className="emp-payslips-card-label">Total Earned (YTD)</span>
              <div className="emp-payslips-icon-box" style={{ background: C.tealSoft }}>
                <Wallet size={16} color={C.teal} />
              </div>
            </div>
            <div className="emp-payslips-card-val">{fmtMoney(totalEarned)}</div>
            <div className="emp-payslips-card-sub teal">
              {paidCount} payslips processed
            </div>
          </div>
        </Card>

        <Card accent={C.blue}>
          <div className="emp-payslips-card-body">
            <div className="emp-payslips-card-header">
              <span className="emp-payslips-card-label">Latest Payslip</span>
              <div className="emp-payslips-icon-box" style={{ background: C.blueSoft }}>
                <FileText size={16} color={C.blue} />
              </div>
            </div>
            <div className="emp-payslips-card-val">
              {latestPayslip ? fmtMoney(latestPayslip.net || latestPayslip.net_salary || 0) : "—"}
            </div>
            <div className="emp-payslips-card-sub blue">
              {latestPayslip?.month || "No data"}
            </div>
          </div>
        </Card>

        <Card accent={C.amber}>
          <div className="emp-payslips-card-body">
            <div className="emp-payslips-card-header">
              <span className="emp-payslips-card-label">Pending</span>
              <div className="emp-payslips-icon-box" style={{ background: C.amberSoft }}>
                <Calendar size={16} color={C.amber} />
              </div>
            </div>
            <div className="emp-payslips-card-val">{pendingCount}</div>
            <div className="emp-payslips-card-sub amber">
              {pendingCount === 0 ? "All clear" : "Awaiting processing"}
            </div>
          </div>
        </Card>
      </div>

      {/* Payslips Table */}
      <div className="emp-payslips-table-card">
        <Card style={{ padding: 0 }}>
          <div className="emp-payslips-table-header">
            <span className="emp-payslips-table-title">Salary Statements</span>
            <Pill tone="slate">{payslips.length} total</Pill>
          </div>

          <Table
            columns={["Month", "Basic", "Allowances", "Deductions", "Net Salary", "Status", "Actions"]}
            rows={payslips}
            renderRow={(p) => (
              <tr key={p.id} className="hoverable emp-payslips-table-row">
                <td className="emp-payslips-table-cell">
                  <div className="emp-payslips-month-cell">
                    <div className="emp-payslips-calendar-icon">
                      <Calendar size={14} color={C.blue} />
                    </div>
                    <span className="emp-payslips-month-name">{p.month}</span>
                  </div>
                </td>
                <td className="emp-payslips-table-cell emp-payslips-muted-val">{fmtMoney(p.basic || 0)}</td>
                <td className="emp-payslips-table-cell emp-payslips-allowance-val">{fmtMoney(p.allowances || 0)}</td>
                <td className="emp-payslips-table-cell emp-payslips-deduction-val">{fmtMoney(p.deductions || 0)}</td>
                <td className="emp-payslips-table-cell">
                  <span className="emp-payslips-net-text">
                    {fmtMoney(p.net || p.net_salary || 0)}
                  </span>
                </td>
                <td className="emp-payslips-table-cell">
                  <Pill tone={statusTone(p.status)}>{p.status}</Pill>
                </td>
                <td className="emp-payslips-table-cell">
                  <div className="emp-payslips-action-group">
                    <button
                      type="button"
                      title="View Details"
                      onClick={() => setDetail(p)}
                      className="emp-payslips-icon-btn blue"
                    >
                      <Eye size={14} color={C.blue} />
                    </button>
                    <button
                      type="button"
                      title="Download Payslip"
                      onClick={() => downloadPayslip(p)}
                      className="emp-payslips-icon-btn teal"
                    >
                      <Download size={14} color={C.teal} />
                    </button>
                  </div>
                </td>
              </tr>
            )}
          />
          {payslips.length === 0 && <EmptyState text="No payslips available yet. They'll appear here once processed." />}
        </Card>
      </div>

      {/* Payslip Detail Modal */}
      {detail && (
        <Modal title={`Payslip — ${detail.month}`} onClose={() => setDetail(null)} width={520}>
          <PayslipDetail payslip={detail} onDownload={downloadPayslip} />
        </Modal>
      )}
    </div>
  );
}

/* ── Payslip Detail ── */
function PayslipDetail({ payslip, onDownload }) {
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
      <div className="payslip-detail-info-grid">
        <InfoRow label="Month" value={payslip.month} />
        <InfoRow label="Status" value={<Pill tone={statusTone(payslip.status)}>{payslip.status}</Pill>} />
        <InfoRow label="Department" value={payslip.department || "—"} />
        <InfoRow label="Employee" value={payslip.name || "—"} />
      </div>

      {/* Breakdown */}
      <div className="payslip-detail-breakdown-card">
        <p className="payslip-detail-breakdown-title">Salary Breakdown</p>
        {rows.map((r) => (
          <div key={r.label} className="payslip-detail-breakdown-row">
            <span className="payslip-detail-breakdown-label">{r.label}</span>
            <span className={`payslip-detail-breakdown-amt ${r.type}`}>
              {r.type === "deduction" ? "−" : "+"}{fmtMoney(r.value)}
            </span>
          </div>
        ))}
      </div>

      {/* Net Pay */}
      <div className="payslip-detail-net-banner">
        <span className="payslip-detail-net-label">Net Pay</span>
        <span className="payslip-detail-net-val">{fmtMoney(netPay)}</span>
      </div>

      <div className="payslip-detail-footer">
        <Button variant="primary" icon={Download} onClick={() => onDownload && onDownload(payslip)}>
          Download Statement
        </Button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div className="payslip-detail-info-label">{label}</div>
      <div className="payslip-detail-info-val">{value}</div>
    </div>
  );
}
