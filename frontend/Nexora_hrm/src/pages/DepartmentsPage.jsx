import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Building2, Users, Search, Mail, Phone, MapPin,
  ArrowRight, X
} from "lucide-react";
import { C } from "../constants/theme";
import { statusTone, fmtMoney } from "../utils/helpers";
import { Card, PageHeader, Avatar, Pill, Table, EmptyState, Modal } from "../components/ui";
import { fetchDepartments } from "../api/departmentsApi";
import { fetchEmployees } from "../api/employeesApi";
import "../styles/DepartmentsPage.css";

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
      <div className="departments-profile-header">
        <Avatar name={employee.name} size={64} />
        <div>
          <div className="departments-profile-name">
            {employee.name}
          </div>
          <div className="departments-profile-sub">
            {employee.role} · {employee.department || "General"}
          </div>
          <div style={{ marginTop: 8 }}>
            <Pill tone={statusTone(employee.status)}>{employee.status || "Active"}</Pill>
          </div>
        </div>
      </div>

      <div className="departments-profile-grid">
        {fields.map((f) => (
          <div key={f.label}>
            <span className="departments-profile-field-label">
              {f.label}
            </span>
            <span className={`departments-profile-field-val ${f.mono ? "mono" : ""}`}>
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
    return employees.filter((e) => {
      if (e.department_id && dept.id && e.department_id === dept.id) return true;
      if (e.department && dept.name) {
        return e.department.toLowerCase().trim() === dept.name.toLowerCase().trim();
      }
      return false;
    });
  };

  // Filtered employees in the selected department
  const filteredDeptEmployees = useMemo(() => {
    if (!selectedDepartment) return [];
    const baseList = getDeptEmployees(selectedDepartment);

    return baseList.filter((e) => {
      // Status filter
      if (statusFilter !== "All" && (e.status || "Active") !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (e.name || "").toLowerCase().includes(q);
        const matchRole = (e.role || "").toLowerCase().includes(q);
        const matchEmail = (e.email || "").toLowerCase().includes(q);
        const matchCode = (e.id || e.employee_code || "").toLowerCase().includes(q);
        if (!matchName && !matchRole && !matchEmail && !matchCode) return false;
      }
      return true;
    });
  }, [selectedDepartment, employees, statusFilter, searchQuery]);

  const handleSelectDepartment = (deptId) => {
    setSelectedDeptId(deptId);
    setSearchQuery("");
    setStatusFilter("All");
    if (empSectionRef.current) {
      empSectionRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.slate, fontFamily: "Inter, sans-serif" }}>
        Loading departments and organization structure...
      </div>
    );
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="Departments"
        subtitle={`${departments.length} functional teams · ${employees.length} total staff members`}
      />

      {/* ── DEPARTMENT SUMMARY CARDS ── */}
      <div className="departments-grid">
        {departments.map((d) => {
          const staff = getDeptEmployees(d);
          const isSelected = selectedDepartment?.id === d.id;

          return (
            <div
              key={d.id}
              onClick={() => handleSelectDepartment(d.id)}
              className={`departments-card ${isSelected ? "selected" : ""}`}
              style={{
                borderLeft: isSelected ? `4px solid ${d.color || C.teal}` : undefined,
              }}
            >
              {/* Header */}
              <div className="departments-card-top">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    className="departments-card-color-dot"
                    style={{ background: d.color || C.teal }}
                  />
                  <div>
                    <h3 className="departments-card-title">
                      {d.name}
                    </h3>
                    <p className="departments-card-head">
                      Head: {d.head || "Not assigned"}
                    </p>
                  </div>
                </div>
                <div
                  className="departments-card-icon-box"
                  style={{ background: (d.color || C.teal) + "18" }}
                >
                  <Building2 size={18} color={d.color || C.teal} />
                </div>
              </div>

              {/* Headcount */}
              <div className="departments-headcount">
                {staff.length} <span className="departments-headcount-sub">team member{staff.length === 1 ? "" : "s"}</span>
              </div>

              {/* Avatars pile & Click indicator */}
              <div className="departments-card-footer">
                <div className="departments-avatars-pile">
                  {staff.slice(0, 5).map((s, i) => (
                    <div
                      key={s.id || i}
                      className="departments-avatar-item"
                      style={{ marginLeft: i === 0 ? 0 : -10 }}
                    >
                      <Avatar name={s.name} size={28} />
                    </div>
                  ))}
                  {staff.length > 5 && (
                    <div className="departments-avatar-more">
                      +{staff.length - 5}
                    </div>
                  )}
                </div>

                {/* View indication badge */}
                <span
                  className="departments-view-badge"
                  style={{ color: isSelected ? (d.color || C.teal) : C.slateLight }}
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
            className="departments-emp-header"
            style={{
              background: `linear-gradient(90deg, ${(selectedDepartment.color || C.teal) + "0A"} 0%, transparent 100%)`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                className="departments-emp-icon-box"
                style={{
                  background: (selectedDepartment.color || C.teal) + "20",
                  border: `1px solid ${(selectedDepartment.color || C.teal) + "40"}`,
                }}
              >
                <Users size={22} color={selectedDepartment.color || C.teal} />
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h2 className="departments-emp-title">
                    Employees in {selectedDepartment.name}
                  </h2>
                  <span
                    className="departments-emp-badge"
                    style={{
                      background: (selectedDepartment.color || C.teal) + "18",
                      color: selectedDepartment.color || C.teal,
                    }}
                  >
                    {getDeptEmployees(selectedDepartment).length} Members
                  </span>
                </div>
                <p className="departments-emp-head-text">
                  Head of Department: <strong>{selectedDepartment.head || "Unassigned"}</strong>
                </p>
              </div>
            </div>

            {/* Search & Status Filters */}
            <div className="departments-emp-filters">
              {/* Search box */}
              <div className="departments-search-box">
                <Search size={14} color={C.slateLight} />
                <input
                  type="text"
                  placeholder="Search staff, role, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="departments-search-input"
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
              <div className="departments-status-pills">
                {["All", "Active", "On Leave", "Inactive"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`departments-status-pill-btn ${statusFilter === s ? "active" : ""}`}
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
                  className="hoverable departments-table-row"
                  onClick={() => setViewingProfile(e)}
                >
                  <td className="departments-table-cell">
                    <div className="departments-staff-cell">
                      <Avatar name={e.name} size={32} />
                      <div>
                        <div className="departments-staff-name">{e.name}</div>
                        {e.manager && (
                          <div className="departments-reports-to">
                            Reports to: {e.manager}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="departments-table-cell departments-cell-code">
                    {e.id || e.employee_code || "—"}
                  </td>
                  <td className="departments-table-cell departments-cell-role">
                    {e.role}
                  </td>
                  <td className="departments-table-cell departments-cell-muted">
                    <div className="departments-cell-icon-text">
                      <Mail size={13} color={C.slateLight} />
                      <span>{e.email}</span>
                    </div>
                  </td>
                  <td className="departments-table-cell departments-cell-muted">
                    {e.phone ? (
                      <div className="departments-cell-icon-text">
                        <Phone size={13} color={C.slateLight} />
                        <span>{e.phone}</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="departments-table-cell departments-cell-muted">
                    {e.location ? (
                      <div className="departments-cell-icon-text">
                        <MapPin size={13} color={C.slateLight} />
                        <span>{e.location}</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="departments-table-cell">
                    <Pill tone={statusTone(e.status)}>{e.status || "Active"}</Pill>
                  </td>
                  <td className="departments-table-cell departments-cell-muted" style={{ whiteSpace: "nowrap" }}>
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
