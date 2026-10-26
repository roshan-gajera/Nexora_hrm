import React, { useState, useEffect, useMemo } from "react";
import {
  Clock, Calendar, Search, Download, RefreshCw, Plus,
  UserCheck, AlertCircle, Home, Building2, CheckCircle2,
  CalendarDays, Edit2, Filter
} from "lucide-react";
import { C } from "../constants/theme";
import { statusTone, exportToCSV } from "../utils/helpers";
import { Card, PageHeader, Table, Avatar, Pill, Button, Modal, Input, Select, EmptyState } from "../components/ui";
import { fetchAttendance, saveAttendance } from "../api/attendanceApi";
import { fetchEmployees } from "../api/employeesApi";
import { useToast } from "../context/ToastContext";

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

  // Filter attendance records based on current date mode, status, dept, and search query
  const filteredList = useMemo(() => {
    return attendance.filter((item) => {
      // Date filter
      if (dateFilterMode === "today" && item.date !== getTodayDateString()) {
        return false;
      }
      if (dateFilterMode === "custom" && item.date !== selectedDate) {
        return false;
      }

      // Status filter
      if (statusFilter !== "All" && item.status !== statusFilter) {
        return false;
      }

      // Department filter
      if (deptFilter !== "All" && (item.department || "").toLowerCase() !== deptFilter.toLowerCase()) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (item.name || "").toLowerCase().includes(q);
        const codeMatch = (item.employeeId || "").toLowerCase().includes(q);
        const deptMatch = (item.department || "").toLowerCase().includes(q);
        if (!nameMatch && !codeMatch && !deptMatch) return false;
      }

      return true;
    });
  }, [attendance, dateFilterMode, selectedDate, statusFilter, deptFilter, searchQuery]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set();
    attendance.forEach((a) => {
      if (a.department && a.department !== "—") set.add(a.department);
    });
    return ["All", ...Array.from(set)];
  }, [attendance]);

  // Counts based on the current date context
  const contextRecords = useMemo(() => {
    if (dateFilterMode === "today") {
      return attendance.filter((a) => a.date === getTodayDateString());
    }
    if (dateFilterMode === "custom") {
      return attendance.filter((a) => a.date === selectedDate);
    }
    return attendance;
  }, [attendance, dateFilterMode, selectedDate]);

  const counts = {
    Present: contextRecords.filter((a) => a.status === "Present").length,
    Late: contextRecords.filter((a) => a.status === "Late").length,
    WFH: contextRecords.filter((a) => a.status === "WFH").length,
    Absent: contextRecords.filter((a) => a.status === "Absent").length,
  };

  const totalEmployeesCount = employees.length || contextRecords.length || 1;
  const totalPresentToday = counts.Present + counts.Late + counts.WFH;
  const attendanceRate = Math.round((totalPresentToday / Math.max(1, totalEmployeesCount)) * 100);

  // Handle Export CSV
  const handleExport = () => {
    if (filteredList.length === 0) {
      toast?.("No attendance records to export.", "warning");
      return;
    }
    const exportData = filteredList.map((a) => ({
      Employee: a.name,
      Employee_ID: a.employeeId,
      Department: a.department,
      Date: a.date,
      Check_In: a.checkIn,
      Check_Out: a.checkOut,
      Duration: calculateDuration(a.checkIn, a.checkOut, a.date),
      Status: a.status,
    }));
    exportToCSV(exportData, `Attendance_${dateFilterMode}_${selectedDate}.csv`);
    toast?.("Attendance records exported successfully!", "success");
  };

  // Open modal for manual marking or editing
  const openMarkModal = (item = null) => {
    if (item) {
      const matchedEmp = employees.find((e) => e.name === item.name || e.employee_code === item.employeeId || e.id === item.employeeId);
      setFormEmployee(matchedEmp ? matchedEmp.pk || matchedEmp.id : "");
      setFormDate(item.date || getTodayDateString());
      setFormCheckIn(item.checkIn && item.checkIn !== "--" ? item.checkIn : "09:30 AM");
      setFormCheckOut(item.checkOut && item.checkOut !== "--" ? item.checkOut : "06:30 PM");
      setFormStatus(item.status || "Present");
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
      <PageHeader
        title="Attendance & Check-ins"
        subtitle={`Live monitoring across the organization · ${todayLabel}`}
        action={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button
              variant="outline"
              icon={RefreshCw}
              small
              onClick={() => loadAttendance(true)}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button
              variant="outline"
              icon={Download}
              small
              onClick={handleExport}
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              small
              onClick={() => openMarkModal()}
            >
              Mark Attendance
            </Button>
          </div>
        }
      />

      {/* Date Filtering Bar */}
      <div
        style={{
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "14px 18px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: C.slate }}>
            Date View:
          </span>
          <div style={{ display: "flex", background: C.canvas, padding: 3, borderRadius: 8, gap: 4 }}>
            <button
              type="button"
              onClick={() => setDateFilterMode("all")}
              style={{
                border: "none",
                background: dateFilterMode === "all" ? "#fff" : "transparent",
                color: dateFilterMode === "all" ? C.ink : C.slate,
                padding: "6px 14px",
                borderRadius: 6,
                fontFamily: "Inter, sans-serif",
                fontSize: 12.5,
                fontWeight: dateFilterMode === "all" ? 600 : 500,
                cursor: "pointer",
                boxShadow: dateFilterMode === "all" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              All Records
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode("today")}
              style={{
                border: "none",
                background: dateFilterMode === "today" ? "#fff" : "transparent",
                color: dateFilterMode === "today" ? C.teal : C.slate,
                padding: "6px 14px",
                borderRadius: 6,
                fontFamily: "Inter, sans-serif",
                fontSize: 12.5,
                fontWeight: dateFilterMode === "today" ? 700 : 500,
                cursor: "pointer",
                boxShadow: dateFilterMode === "today" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {/* <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981" }} /> */}
              Today Live
            </button>
            <button
              type="button"
              onClick={() => setDateFilterMode("custom")}
              style={{
                border: "none",
                background: dateFilterMode === "custom" ? "#fff" : "transparent",
                color: dateFilterMode === "custom" ? C.ink : C.slate,
                padding: "6px 14px",
                borderRadius: 6,
                fontFamily: "Inter, sans-serif",
                fontSize: 12.5,
                fontWeight: dateFilterMode === "custom" ? 600 : 500,
                cursor: "pointer",
                boxShadow: dateFilterMode === "custom" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              Pick Date
            </button>
          </div>

          {dateFilterMode === "custom" && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "5px 10px",
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                color: C.ink,
                outline: "none",
              }}
            />
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.slate }}>
            Showing: <strong style={{ color: C.ink }}>{filteredList.length}</strong> records
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 20 }}>
        <Card accent={C.teal}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, color: C.slate, fontWeight: 600 }}>Present</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: C.tealSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={15} color={C.teal} />
            </div>
          </div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: C.ink }}>
            {counts.Present}
          </div>
          <div style={{ fontSize: 11.5, color: C.slateLight, marginTop: 4 }}>In-office checked in</div>
        </Card>

        <Card accent={C.blue}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, color: C.slate, fontWeight: 600 }}>WFH</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: C.blueSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Home size={15} color={C.blue} />
            </div>
          </div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: C.ink }}>
            {counts.WFH}
          </div>
          <div style={{ fontSize: 11.5, color: C.slateLight, marginTop: 4 }}>Remote check-ins</div>
        </Card>

        <Card accent={C.amber}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, color: C.slate, fontWeight: 600 }}>Late</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: C.amberSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertCircle size={15} color={C.amber} />
            </div>
          </div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: C.ink }}>
            {counts.Late}
          </div>
          <div style={{ fontSize: 11.5, color: C.slateLight, marginTop: 4 }}>After shift grace period</div>
        </Card>

        <Card accent={C.coral}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12.5, color: C.slate, fontWeight: 600 }}>Absent</span>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: C.coralSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertCircle size={15} color={C.coral} />
            </div>
          </div>
          <div style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: C.ink }}>
            {counts.Absent}
          </div>
          <div style={{ fontSize: 11.5, color: C.slateLight, marginTop: 4 }}>No check-in recorded</div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card style={{ padding: 0 }}>
        {/* Search & Filter Toolbars */}
        <div
          style={{
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${C.border}`,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Status Pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["All", "Present", "WFH", "Late", "Absent"].map((s) => (
              <div key={s} onClick={() => setStatusFilter(s)} style={{ cursor: "pointer" }}>
                <Pill tone={s === statusFilter ? statusTone(s === "All" ? "Active" : s) : "slate"}>
                  {s}
                </Pill>
              </div>
            ))}
          </div>

          {/* Search & Department Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.canvas, padding: "6px 12px", borderRadius: 8, width: 220 }}>
              <Search size={14} color={C.slateLight} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, code..."
                style={{ border: "none", background: "transparent", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 13, width: "100%", color: C.ink }}
              />
            </div>

            {departments.length > 2 && (
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  color: C.ink,
                  outline: "none",
                  background: "#fff",
                }}
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
          <div style={{ padding: 40, textAlign: "center", color: C.slate }}>
            Loading attendance records...
          </div>
        ) : filteredList.length === 0 ? (
          <div style={{ padding: 36 }}>
            <EmptyState text="No attendance records found matching your filters." />
          </div>
        ) : (
          <Table
            columns={["Employee", "ID", "Department", "Date", "Check-in", "Check-out", "Hours", "Status", "Actions"]}
            rows={filteredList}
            renderRow={(a, idx) => {
              const duration = calculateDuration(a.checkIn, a.checkOut, a.date);
              return (
                <tr key={a.id || idx} className="hoverable" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={a.name} size={30} />
                    <span style={{ fontWeight: 600, color: C.ink }}>{a.name}</span>
                  </td>
                  <td style={{ padding: "12px 14px", fontFamily: "IBM Plex Mono, monospace", fontSize: 13, color: C.slate }}>
                    {a.employeeId}
                  </td>
                  <td style={{ padding: "12px 14px", color: C.slate }}>
                    {a.department || "—"}
                  </td>
                  <td style={{ padding: "12px 14px", color: C.slate, whiteSpace: "nowrap" }}>
                    {a.date}
                  </td>
                  <td style={{ padding: "12px 14px", color: C.ink, fontFamily: "IBM Plex Mono, monospace", fontSize: 13 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Clock size={13} color={C.teal} />
                      {a.checkIn || "--"}
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", color: C.slate, fontFamily: "IBM Plex Mono, monospace", fontSize: 13 }}>
                    {a.checkOut || "--"}
                  </td>
                  <td style={{ padding: "12px 14px", fontFamily: "IBM Plex Mono, monospace", fontSize: 13, color: duration !== "--" ? C.teal : C.slateLight, fontWeight: 600 }}>
                    {duration}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <Pill tone={statusTone(a.status)}>{a.status}</Pill>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <button
                      type="button"
                      onClick={() => openMarkModal(a)}
                      title="Edit attendance"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: C.slateLight,
                        display: "flex",
                        alignItems: "center",
                        padding: 4,
                        borderRadius: 4,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = C.ink)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = C.slateLight)}
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
            <label style={{ display: "block", marginBottom: 14 }}>
              <span style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: C.slate, marginBottom: 5 }}>
                Select Employee *
              </span>
              <select
                value={formEmployee}
                onChange={(e) => setFormEmployee(e.target.value)}
                required
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  padding: "9px 12px",
                  borderRadius: 7,
                  border: `1px solid ${C.border}`,
                  outline: "none",
                  color: C.ink,
                  background: "#fff",
                }}
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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

            <label style={{ display: "block", marginBottom: 18 }}>
              <span style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: C.slate, marginBottom: 5 }}>
                Attendance Status *
              </span>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  padding: "9px 12px",
                  borderRadius: 7,
                  border: `1px solid ${C.border}`,
                  outline: "none",
                  color: C.ink,
                  background: "#fff",
                }}
              >
                <option value="Present">Present</option>
                <option value="WFH">WFH (Work From Home)</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
              </select>
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
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
