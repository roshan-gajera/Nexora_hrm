import React, { useState, useEffect, useMemo } from "react";
import {
  Clock, Download, RefreshCw, Plus,
  AlertCircle, Home, CheckCircle2,
  Edit2,Search
} from "lucide-react";
import { C } from "../constants/theme";
import { statusTone, exportToCSV } from "../utils/helpers";
import { Card, PageHeader, Table, Avatar, Pill, Button, Modal, Input, EmptyState } from "../components/ui";
import { fetchAttendance, saveAttendance } from "../api/attendanceApi";
import { fetchEmployees } from "../api/employeesApi";
import { useToast } from "../context/ToastContext";
import "../styles/AttendancePage.css";

/** Helper to parse time string like "09:30 AM" into Date for duration calculation */
function parseTime(timeStr, dateStr) {
  if (!timeStr || timeStr === "--") return null;
  try {
    const baseDate = dateStr ? new Date(dateStr) : new Date();
    const parts = timeStr.trim().split(" ");
    const timeParts = parts[0].split(":");
    let hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1] || "0", 10);
    const modifier = parts[1] ? parts[1].toUpperCase() : null;

    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes, 0);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function calculateDuration(checkIn, checkOut, dateStr) {
  const start = parseTime(checkIn, dateStr);
  const end = parseTime(checkOut, dateStr);
  if (!start || !end || end < start) return "--";
  const diffMs = end - start;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${mins}m`;
}

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AttendancePage() {
  const toast = useToast();

  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [dateFilterMode, setDateFilterMode] = useState("all"); // "today" | "custom" | "all"
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [statusFilter, setStatusFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State for Manual Marking
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formEmployee, setFormEmployee] = useState("");
  const [formDate, setFormDate] = useState(getTodayDateString());
  const [formCheckIn, setFormCheckIn] = useState("09:30 AM");
  const [formCheckOut, setFormCheckOut] = useState("06:30 PM");
  const [formStatus, setFormStatus] = useState("Present");
  const [saving, setSaving] = useState(false);

  // Load attendance records
  const loadAttendance = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const [attRes, empRes] = await Promise.all([
        fetchAttendance(),
        fetchEmployees().catch(() => []),
      ]);

      const items = Array.isArray(attRes) ? attRes : attRes?.results || [];
      setAttendance(items);

      const empItems = Array.isArray(empRes) ? empRes : empRes?.results || [];
      setEmployees(empItems);
    } catch (err) {
      console.warn("Failed to load attendance:", err);
      toast?.("Failed to fetch attendance records.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  // Unique departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set();
    attendance.forEach((a) => {
      if (a.department) set.add(a.department);
    });
    return ["All", ...Array.from(set)];
  }, [attendance]);

  // Filtered dataset
  const filteredList = useMemo(() => {
    const todayStr = getTodayDateString();

    return attendance.filter((a) => {
      // Date filter
      if (dateFilterMode === "today" && a.date !== todayStr) return false;
      if (dateFilterMode === "custom" && a.date !== selectedDate) return false;

      // Status filter
      if (statusFilter !== "All" && a.status !== statusFilter) return false;

      // Department filter
      if (deptFilter !== "All" && a.department !== deptFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (a.name || "").toLowerCase().includes(q);
        const matchCode = (a.employeeId || "").toLowerCase().includes(q);
        const matchDept = (a.department || "").toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchDept) return false;
      }

      return true;
    });
  }, [attendance, dateFilterMode, selectedDate, statusFilter, deptFilter, searchQuery]);

  // Statistics calculation for the current view
  const counts = useMemo(() => {
    const res = { Present: 0, WFH: 0, Late: 0, Absent: 0 };
    filteredList.forEach((a) => {
      if (res[a.status] !== undefined) res[a.status]++;
    });
    return res;
  }, [filteredList]);

  // Export CSV
  const handleExport = () => {
    exportToCSV(filteredList, `Attendance_${dateFilterMode}_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Open Mark Modal
  const openMarkModal = (existing = null) => {
    if (existing) {
      setFormEmployee(existing.employeeDbId || existing.employeeId || "");
      setFormDate(existing.date || getTodayDateString());
      setFormCheckIn(existing.checkIn && existing.checkIn !== "--" ? existing.checkIn : "09:30 AM");
      setFormCheckOut(existing.checkOut && existing.checkOut !== "--" ? existing.checkOut : "06:30 PM");
      setFormStatus(existing.status === "Absent" ? "Present" : (existing.status || "Present"));
    } else {
      setFormEmployee(employees[0]?.pk || employees[0]?.id || "");
      setFormDate(getTodayDateString());
      setFormCheckIn("09:30 AM");
      setFormCheckOut("06:30 PM");
      setFormStatus("Present");
    }
    setIsModalOpen(true);
  };

  // Save manual attendance
  const handleSaveAttendance = async (e) => {
    e.preventDefault();
    if (!formEmployee) {
      toast?.("Please select an employee.", "warning");
      return;
    }
    setSaving(true);
    try {
      await saveAttendance({
        employee: formEmployee,
        date: formDate,
        check_in: formCheckIn,
        check_out: formCheckOut,
        status: formStatus,
      });
      toast?.("Attendance saved successfully!", "success");
      setIsModalOpen(false);
      await loadAttendance(true);
    } catch (err) {
      toast?.(err?.message || "Failed to save attendance.", "error");
    } finally {
      setSaving(false);
    }
  };

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="page-enter">
      {/* Page Header */}
      <PageHeader title="Attendance & Check-ins" subtitle={`Live monitoring across the organization · ${todayLabel}`} action={
          <div className="attendance-header-actions">

            <Button variant="outline" icon={RefreshCw} small onClick={() => loadAttendance(true)}>
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
            
            <Button variant="outline" icon={Download} small onClick={handleExport}>
              Export CSV
            </Button>

            <Button variant="primary" icon={Plus} small onClick={() => openMarkModal()}>
              Mark Attendance
            </Button>
          </div>
        }
      />

      {/* Date Filtering Bar */}
      <div className="attendance-date-bar">
        <div className="attendance-date-group">
          <span className="attendance-date-label">
            Date View:
          </span>
          <div className="attendance-date-pill-group">
            <button type="button" onClick={() => setDateFilterMode("today")} className={`attendance-date-pill-btn ${dateFilterMode === "today" ? "active-teal" : ""}`}>
              Today Live
            </button>
            
            <button type="button" onClick={() => setDateFilterMode("all")} className={`attendance-date-pill-btn ${dateFilterMode === "all" ? "active" : ""}`}>
              All Records
            </button>

            <button type="button" onClick={() => setDateFilterMode("custom")} className={`attendance-date-pill-btn ${dateFilterMode === "custom" ? "active" : ""}`}>
              Pick Date
            </button>

          </div>

          {dateFilterMode === "custom" && (
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="attendance-date-input"/>
          )}
        </div>

        <div>
          <div className="attendance-record-count">
            Showing: <strong>{filteredList.length}</strong> records
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="attendance-kpi-grid">
        <Card accent={C.teal}>
          <div className="attendance-kpi-header">
            <span className="attendance-kpi-label">Present</span>
            <div className="attendance-kpi-icon-box" style={{ background: C.tealSoft }}>
              <CheckCircle2 size={15} color={C.teal} />
            </div>
          </div>
          <div className="attendance-kpi-val">
            {counts.Present}
          </div>
          <div className="attendance-kpi-sub">In-office checked in</div>
        </Card>

        <Card accent={C.blue}>
          <div className="attendance-kpi-header">
            <span className="attendance-kpi-label">WFH</span>
            <div className="attendance-kpi-icon-box" style={{ background: C.blueSoft }}>
              <Home size={15} color={C.blue} />
            </div>
          </div>
          <div className="attendance-kpi-val">
            {counts.WFH}
          </div>
          <div className="attendance-kpi-sub">Remote check-ins</div>
        </Card>

        <Card accent={C.amber}>
          <div className="attendance-kpi-header">
            <span className="attendance-kpi-label">Late</span>
            <div className="attendance-kpi-icon-box" style={{ background: C.amberSoft }}>
              <AlertCircle size={15} color={C.amber} />
            </div>
          </div>
          <div className="attendance-kpi-val">
            {counts.Late}
          </div>
          <div className="attendance-kpi-sub">After shift grace period</div>
        </Card>

        <Card accent={C.coral}>
          <div className="attendance-kpi-header">
            <span className="attendance-kpi-label">Absent</span>
            <div className="attendance-kpi-icon-box" style={{ background: C.coralSoft }}>
              <AlertCircle size={15} color={C.coral} />
            </div>
          </div>
          <div className="attendance-kpi-val">
            {counts.Absent}
          </div>
          <div className="attendance-kpi-sub">No check-in recorded</div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card style={{ padding: 0 }}>
        {/* Search & Filter Toolbars */}
        <div className="attendance-toolbar">
          {/* Status Pills */}
          <div className="attendance-status-pills">
            {["All", "Present", "WFH", "Late", "Absent"].map((s) => (
              <div key={s} onClick={() => setStatusFilter(s)} className="attendance-status-pill-item">
                <Pill tone={s === statusFilter ? statusTone(s === "All" ? "Active" : s) : "slate"}>
                  {s}
                </Pill>
              </div>
            ))}
          </div>

          {/* Search & Department Filters */}
          <div className="attendance-search-filter-group">
            <div className="attendance-search-box">
              <Search size={14} color={C.slateLight} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, code..."
                className="attendance-search-input"
              />
            </div>

            {departments.length > 2 && (
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="attendance-dept-select"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d === "All" ? "All Departments" : d}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="attendance-loading">
            Loading attendance records...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="attendance-empty">
            <EmptyState text="No attendance records found matching your filters." />
          </div>
        ) : (
          <Table
            columns={["Employee", "ID", "Department", "Date", "Check-in", "Check-out", "Hours", "Status", "Actions"]}
            rows={filteredList}
            renderRow={(a, idx) => {
              const duration = calculateDuration(a.checkIn, a.checkOut, a.date);
              return (
                <tr key={a.id || idx} className="hoverable attendance-table-row">
                  <td className="attendance-table-cell">
                    <div className="attendance-employee-cell">
                      <Avatar name={a.name} size={30} />
                      <span className="attendance-employee-name">{a.name}</span>
                    </div>
                  </td>
                  <td className="attendance-table-cell attendance-code-cell">
                    {a.employeeId}
                  </td>
                  <td className="attendance-table-cell attendance-muted-cell">
                    {a.department || "—"}
                  </td>
                  <td className="attendance-table-cell attendance-muted-cell" style={{ whiteSpace: "nowrap" }}>
                    {a.date}
                  </td>
                  <td className="attendance-table-cell attendance-time-cell">
                    <div className="attendance-time-flex">
                      <Clock size={13} color={C.teal} />
                      {a.checkIn || "--"}
                    </div>
                  </td>
                  <td className="attendance-table-cell attendance-muted-cell" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 13 }}>
                    {a.checkOut || "--"}
                  </td>
                  <td className={`attendance-table-cell attendance-hours-cell ${duration !== "--" ? "active" : "muted"}`}>
                    {duration}
                  </td>
                  <td className="attendance-table-cell">
                    <Pill tone={statusTone(a.status)}>{a.status}</Pill>
                  </td>
                  <td className="attendance-table-cell">
                    <button
                      type="button"
                      onClick={() => openMarkModal(a)}
                      title="Edit attendance"
                      className="attendance-edit-btn"
                    >
                      <Edit2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            }}
          />
        )}
      </Card>

      {/* Manual Mark / Edit Modal */}
      {isModalOpen && (
        <Modal title="Mark / Edit Attendance" onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSaveAttendance}>
            <label className="attendance-form-group">
              <span className="attendance-form-label">
                Select Employee *
              </span>
              <select
                value={formEmployee}
                onChange={(e) => setFormEmployee(e.target.value)}
                required
                className="attendance-form-select"
              >
                <option value="">-- Choose Employee --</option>
                {employees.map((e) => (
                  <option key={e.pk || e.id} value={e.pk || e.id}>
                    {e.name} ({e.employee_code || e.id}) — {e.department || "No Dept"}
                  </option>
                ))}
              </select>
            </label>

            <Input
              label="Date *"
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              required
            />

            <div className="attendance-form-row">
              <Input
                label="Check In Time"
                type="text"
                placeholder="e.g. 09:30 AM"
                value={formCheckIn}
                onChange={(e) => setFormCheckIn(e.target.value)}
              />
              <Input
                label="Check Out Time"
                type="text"
                placeholder="e.g. 06:30 PM"
                value={formCheckOut}
                onChange={(e) => setFormCheckOut(e.target.value)}
              />
            </div>

            <label className="attendance-form-group" style={{ marginBottom: 18 }}>
              <span className="attendance-form-label">
                Attendance Status *
              </span>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                className="attendance-form-select"
              >
                <option value="Present">Present</option>
                <option value="WFH">WFH (Work From Home)</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
              </select>
            </label>

            <div className="attendance-form-actions">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Record"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
