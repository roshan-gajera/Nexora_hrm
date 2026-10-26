import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Building2, Users, Search, Mail, Phone, MapPin,
  Calendar, ArrowRight, UserCheck, CheckCircle2, ChevronRight, X
} from "lucide-react";
import { C } from "../constants/theme";
import { statusTone, fmtMoney } from "../utils/helpers";
import { Card, PageHeader, Avatar, Pill, Table, EmptyState, Modal, Button } from "../components/ui";
import { fetchDepartments } from "../api/departmentsApi";
import { fetchEmployees } from "../api/employeesApi";

function EmployeeProfileModal({ employee, onClose }) {
  if (!employee) return null;
  const fields = [
    { label: "Employee ID", value: employee.id, mono: true },
    { label: "Manager",     value: employee.manager || "—" },
    { label: "Email",       value: employee.email,    icon: <Mail size={13} />  },
    { label: "Phone",       value: employee.phone || "—", icon: <Phone size={13} /> },
    { label: "Location",    value: employee.location || "—", icon: <MapPin size={13} /> },
    { label: "Joined",      value: employee.joinDate || "—" },
    { label: "Salary",      value: employee.salary ? fmtMoney(employee.salary) : "—" },
    { label: "Employment",  value: employee.status || "Active" },
  ];

  return (
    <Modal title="Employee Profile" onClose={onClose} width={520}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20, padding: "0 0 18px", borderBottom: `1px solid ${C.border}` }}>
        <Avatar name={employee.name} size={64} />
        <div>
          <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 19, color: C.ink }}>
            {employee.name}
          </div>
          <div style={{ color: C.slate, fontSize: 13.5, marginTop: 2 }}>
            {employee.role} · {employee.department || "General"}
          </div>
          <div style={{ marginTop: 8 }}>
            <Pill tone={statusTone(employee.status)}>{employee.status || "Active"}</Pill>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
        {fields.map((f) => (
          <div key={f.label}>
            <span style={{ display: "block", color: C.slateLight, fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
              {f.label}
            </span>
            <span style={{ color: C.ink, fontWeight: 500, fontFamily: f.mono ? "IBM Plex Mono, monospace" : "inherit", display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
              {f.icon} {f.value}
            </span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [employees,   setEmployees]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewingProfile, setViewingProfile] = useState(null);

  const empSectionRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.allSettled([fetchDepartments(), fetchEmployees()])
      .then(([deptRes, empRes]) => {
        if (!isMounted) return;
        let deptList = [];
        if (deptRes.status === "fulfilled") {
          deptList = Array.isArray(deptRes.value) ? deptRes.value : deptRes.value?.results || [];
          setDepartments(deptList);
        }
        if (empRes.status === "fulfilled") {
          const empList = Array.isArray(empRes.value) ? empRes.value : empRes.value?.results || [];
          setEmployees(empList);
        }

        // Auto-select first department if available
        if (deptList.length > 0) {
          setSelectedDeptId(deptList[0].id);
        }
      })
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, []);

  const selectedDepartment = useMemo(() => {
    return departments.find((d) => d.id === selectedDeptId) || departments[0] || null;
  }, [departments, selectedDeptId]);

  // Check matching employees for a department
  const getDeptEmployees = (dept) => {
    if (!dept) return [];
    return employees.filter((e) =>
      e.department === dept.name ||
      e.department_name === dept.name ||
      e.department === dept.id ||
      e.department_id === dept.id
    );
  };

  // Filtered employees for the currently selected department
  const filteredDeptEmployees = useMemo(() => {
    if (!selectedDepartment) return [];
    const baseList = getDeptEmployees(selectedDepartment);

    return baseList.filter((e) => {
      // Status filter
      if (statusFilter !== "All" && e.status !== statusFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (e.name || "").toLowerCase().includes(q);
        const codeMatch = (e.id || e.employee_code || "").toLowerCase().includes(q);
        const roleMatch = (e.role || "").toLowerCase().includes(q);
        const emailMatch = (e.email || "").toLowerCase().includes(q);
        if (!nameMatch && !codeMatch && !roleMatch && !emailMatch) return false;
      }

      return true;
    });
  }, [selectedDepartment, employees, statusFilter, searchQuery]);

  const handleSelectDept = (dept) => {
    setSelectedDeptId(dept.id);
    setSearchQuery("");
    setStatusFilter("All");
  };

  if (loading) {
    return (
      <div style={{ padding: 50, textAlign: "center", color: C.slate, fontFamily: "Inter, sans-serif" }}>
        Loading departments and staff data...
      </div>
    );
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="Departments"
        subtitle="Organizational structure and headcount by functional unit. Click any department to view its team members."
      />

      {/* ── DEPARTMENT CARDS GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 28 }}>
        {departments.map((d) => {
          const staff = getDeptEmployees(d);
          const isSelected = selectedDepartment?.id === d.id;

          return (
            <div
              key={d.id}
              onClick={() => handleSelectDept(d)}
              style={{
                background: C.panel,
                borderRadius: 12,
                padding: 20,
                cursor: "pointer",
                border: isSelected ? `2px solid ${d.color || C.teal}` : `1px solid ${C.border}`,
                borderLeft: `5px solid ${d.color || C.teal}`,
                boxShadow: isSelected
                  ? `0 8px 24px ${d.color ? d.color + "22" : "rgba(31,138,112,0.15)"}`
                  : "0 2px 8px rgba(0,0,0,0.02)",
                transform: isSelected ? "translateY(-2px)" : "none",
                transition: "all 0.2s ease",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 8px 20px rgba(20,33,61,0.08)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)";
                }
              }}
            >
              {/* Card Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 16, color: C.ink }}>
                    {d.name}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.slate, marginTop: 2 }}>
                    Head: <span style={{ fontWeight: 600, color: C.ink }}>{d.head || "Unassigned"}</span>
                  </div>
                </div>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: (d.color || C.teal) + "18",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Building2 size={18} color={d.color || C.teal} />
                </div>
              </div>

              {/* Headcount */}
              <div style={{ fontFamily: "Sora, sans-serif", fontSize: 24, fontWeight: 700, color: C.ink, marginBottom: 12 }}>
                {staff.length} <span style={{ fontSize: 12.5, fontWeight: 500, color: C.slateLight }}>team member{staff.length === 1 ? "" : "s"}</span>
              </div>

              {/* Avatars pile & Click indicator */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", marginLeft: 4 }}>
                  {staff.slice(0, 5).map((s, i) => (
                    <div
                      key={s.id || i}
                      style={{
                        marginLeft: i === 0 ? 0 : -10,
                        border: `2px solid ${C.panel}`,
                        borderRadius: "50%",
                      }}
                    >
                      <Avatar name={s.name} size={28} />
                    </div>
                  ))}
                  {staff.length > 5 && (
                    <div
                      style={{
                        marginLeft: -10,
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: C.canvas,
                        border: `2px solid ${C.panel}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontFamily: "Inter, sans-serif",
                        fontWeight: 700,
                        color: C.slate,
                      }}
                    >
                      +{staff.length - 5}
                    </div>
                  )}
                </div>

                {/* View indication badge */}
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: isSelected ? (d.color || C.teal) : C.slateLight,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {isSelected ? "Viewing Team" : "Click to view"}
                  <ArrowRight size={13} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── SELECTED DEPARTMENT EMPLOYEES SECTION ── */}
      {selectedDepartment && (
        <Card ref={empSectionRef} style={{ padding: 0 }}>
          {/* Header Banner */}
          <div
            style={{
              padding: "20px 24px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
              background: `linear-gradient(90deg, ${(selectedDepartment.color || C.teal) + "0A"} 0%, transparent 100%)`,
              borderTopLeftRadius: 10,
              borderTopRightRadius: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: (selectedDepartment.color || C.teal) + "20",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${(selectedDepartment.color || C.teal) + "40"}`,
                }}
              >
                <Users size={22} color={selectedDepartment.color || C.teal} />
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 18, fontWeight: 700, color: C.ink, margin: 0 }}>
                    Employees in {selectedDepartment.name}
                  </h2>
                  <span
                    style={{
                      background: (selectedDepartment.color || C.teal) + "18",
                      color: selectedDepartment.color || C.teal,
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "2px 10px",
                      borderRadius: 999,
                    }}
                  >
                    {getDeptEmployees(selectedDepartment).length} Members
                  </span>
                </div>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.slate, margin: "4px 0 0" }}>
                  Head of Department: <strong>{selectedDepartment.head || "Unassigned"}</strong>
                </p>
              </div>
            </div>

            {/* Search & Status Filters */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {/* Search box */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.canvas, padding: "7px 12px", borderRadius: 8, width: 220 }}>
                <Search size={14} color={C.slateLight} />
                <input
                  type="text"
                  placeholder="Search staff, role, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: "none",
                    background: "transparent",
                    outline: "none",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 13,
                    width: "100%",
                    color: C.ink,
                  }}
                />
                {searchQuery && (
                  <X
                    size={14}
                    style={{ cursor: "pointer", color: C.slateLight }}
                    onClick={() => setSearchQuery("")}
                  />
                )}
              </div>

              {/* Status filter pills */}
              <div style={{ display: "flex", gap: 6 }}>
                {["All", "Active", "On Leave", "Inactive"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    style={{
                      border: "none",
                      padding: "5px 12px",
                      borderRadius: 6,
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      background: statusFilter === s ? C.ink : C.canvas,
                      color: statusFilter === s ? "#fff" : C.slate,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Employees Table */}
          {filteredDeptEmployees.length === 0 ? (
            <div style={{ padding: 40 }}>
              <EmptyState
                text={
                  searchQuery || statusFilter !== "All"
                    ? `No employees in ${selectedDepartment.name} matching your filter criteria.`
                    : `No employees currently assigned to ${selectedDepartment.name}.`
                }
              />
            </div>
          ) : (
            <Table
              columns={["Employee", "ID", "Role / Designation", "Email", "Phone", "Location", "Status", "Joined"]}
              rows={filteredDeptEmployees}
              renderRow={(e) => (
                <tr
                  key={e.id || e.pk}
                  className="hoverable"
                  onClick={() => setViewingProfile(e)}
                  style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
                >
                  <td style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={e.name} size={32} />
                    <div>
                      <div style={{ fontWeight: 600, color: C.ink }}>{e.name}</div>
                      {e.manager && (
                        <div style={{ fontSize: 11, color: C.slateLight }}>
                          Reports to: {e.manager}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", fontFamily: "IBM Plex Mono, monospace", fontSize: 13, color: C.slate }}>
                    {e.id || e.employee_code || "—"}
                  </td>
                  <td style={{ padding: "12px 16px", color: C.ink, fontWeight: 500 }}>
                    {e.role}
                  </td>
                  <td style={{ padding: "12px 16px", color: C.slate }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Mail size={13} color={C.slateLight} />
                      <span style={{ fontSize: 13 }}>{e.email}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", color: C.slate }}>
                    {e.phone ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Phone size={13} color={C.slateLight} />
                        <span style={{ fontSize: 13 }}>{e.phone}</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", color: C.slate }}>
                    {e.location ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <MapPin size={13} color={C.slateLight} />
                        <span style={{ fontSize: 13 }}>{e.location}</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <Pill tone={statusTone(e.status)}>{e.status || "Active"}</Pill>
                  </td>
                  <td style={{ padding: "12px 16px", color: C.slate, whiteSpace: "nowrap", fontSize: 13 }}>
                    {e.joinDate || "—"}
                  </td>
                </tr>
              )}
            />
          )}
        </Card>
      )}

      {/* Employee Profile Quick-view Modal */}
      {viewingProfile && (
        <EmployeeProfileModal
          employee={viewingProfile}
          onClose={() => setViewingProfile(null)}
        />
      )}
    </div>
  );
}
