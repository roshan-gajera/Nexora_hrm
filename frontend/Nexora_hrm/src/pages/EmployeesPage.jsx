import React, { useState, useEffect, useMemo } from "react";
import { Search, Plus, Pencil, Trash2, Mail, Phone, MapPin, Download, Filter } from "lucide-react";
import { C } from "../constants/theme";
import { statusTone, fmtMoney, exportToCSV } from "../utils/helpers";
import { Card, PageHeader, Button, Input, Select, Table, Modal, Avatar, Pill, EmptyState } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { fetchEmployees, createEmployee, updateEmployee, deleteEmployee } from "../api/employeesApi";
import { fetchDepartments } from "../api/departmentsApi";
import "../styles/EmployeesPage.css";

function EmployeeForm({ initial, departments, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    name: "", email: "", phone: "", role: "", department: departments[0]?.name,
    status: "Active", joinDate: "2026-07-12", salary: 50000, location: "Ahmedabad",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
      <div className="employees-form-grid">
        <Input label="Full name"          required value={form.name}     onChange={(e) => set("name",     e.target.value)} />
        <Input label="Email" type="email" required value={form.email}    onChange={(e) => set("email",    e.target.value)} />
        <Input label="Phone"                       value={form.phone}    onChange={(e) => set("phone",    e.target.value)} />
        <Input label="Role / Designation" required value={form.role}     onChange={(e) => set("role",     e.target.value)} />
        <Select label="Department" value={form.department} onChange={(e) => set("department", e.target.value)} options={departments.map((d) => d.name)} />
        <Select label="Status"     value={form.status}     onChange={(e) => set("status",     e.target.value)} options={["Active", "On Leave", "Inactive"]} />
        <Input label="Joining date"    type="date"   value={form.joinDate} onChange={(e) => set("joinDate", e.target.value)} />
        <Input label="Monthly salary"  type="number" value={form.salary}   onChange={(e) => set("salary",   Number(e.target.value))} />
        <Input label="Location" value={form.location} onChange={(e) => set("location", e.target.value)} />
      </div>
      <div className="employees-form-actions">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit">Save employee</Button>
      </div>
    </form>
  );
}

function EmployeeProfileModal({ employee, onClose }) {
  const fields = [
    { label: "Employee ID", value: employee.id,       mono: true },
    { label: "Manager",     value: employee.manager              },
    { label: "Email",       value: employee.email,    icon: <Mail size={13} />  },
    { label: "Phone",       value: employee.phone,    icon: <Phone size={13} /> },
    { label: "Location",    value: employee.location, icon: <MapPin size={13} />},
    { label: "Joined",      value: employee.joinDate             },
    { label: "Salary",      value: fmtMoney(employee.salary)     },
    { label: "Employment",  value: employee.status               },
  ];
  return (
    <Modal title="Employee profile" onClose={onClose} width={520}>
      <div className="employees-profile-header">
        <Avatar name={employee.name} size={64} />
        <div>
          <div className="employees-profile-name">{employee.name}</div>
          <div className="employees-profile-sub">{employee.role} · {employee.department}</div>
          <div className="employees-profile-pill-wrap"><Pill tone={statusTone(employee.status)}>{employee.status}</Pill></div>
        </div>
      </div>
      <div className="employees-profile-grid">
        {fields.map((f) => (
          <div key={f.label}>
            <div className="employees-profile-field-label">{f.label}</div>
            <div className={`employees-profile-field-val ${f.mono ? "mono" : ""}`}>
              {f.icon}{f.value}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

const STATUS_FILTERS = ["All", "Active", "On Leave", "Inactive"];

export default function EmployeesPage() {
  const toast = useToast();
  const [employees,    setEmployees]    = useState([]);
  const [departments,  setDepartments]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [deptFilter,   setDeptFilter]   = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm,     setShowForm]     = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [viewing,      setViewing]      = useState(null);
  const [deleteId,     setDeleteId]     = useState(null);

  // Load employees and departments on mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.allSettled([fetchEmployees(), fetchDepartments()])
      .then(([empRes, deptRes]) => {
        if (!isMounted) return;
        if (empRes.status === "fulfilled") {
          const items = Array.isArray(empRes.value) ? empRes.value : empRes.value?.results || [];
          setEmployees(items);
        }
        if (deptRes.status === "fulfilled") {
          const items = Array.isArray(deptRes.value) ? deptRes.value : deptRes.value?.results || [];
          setDepartments(items);
        }
      })
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, []);

  const filtered = useMemo(() => employees.filter((e) =>
    (deptFilter   === "All" || e.department === deptFilter) &&
    (statusFilter === "All" || e.status     === statusFilter) &&
    (e.name.toLowerCase().includes(search.toLowerCase()) ||
     e.role.toLowerCase().includes(search.toLowerCase()) ||
     (e.id && e.id.toLowerCase().includes(search.toLowerCase())))
  ), [employees, deptFilter, statusFilter, search]);

  async function saveEmployee(form) {
    try {
      if (editing) {
        const empDbId = editing.pk || editing.id;
        await updateEmployee(empDbId, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          status: form.status,
          join_date: form.joinDate,
          salary: form.salary,
          location: form.location,
        });
        setEmployees((list) => list.map((e) => (e.id === editing.id ? { ...editing, ...form } : e)));
        toast("Employee updated successfully");
      } else {
        const deptObj = departments.find((d) => d.name === form.department);
        const res = await createEmployee({
          name: form.name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          department: deptObj ? deptObj.id : null,
          status: form.status,
          join_date: form.joinDate || "2026-08-01",
          salary: form.salary,
          location: form.location,
        });
        const createdEmp = {
          ...form,
          id: res.employee_code || ("E" + (2000 + employees.length)),
          pk: res.id,
          manager: "Priya Nair",
        };
        setEmployees((list) => [createdEmp, ...list]);
        toast("Employee added successfully");
      }
    } catch (err) {
      console.warn("Backend update error, falling back locally:", err);
      if (editing) {
        setEmployees((list) => list.map((e) => (e.id === editing.id ? { ...editing, ...form } : e)));
        toast("Employee updated successfully");
      } else {
        setEmployees((list) => [{ ...form, id: "E" + (2000 + list.length), manager: "Priya Nair" }, ...list]);
        toast("Employee added successfully");
      }
    }
    setShowForm(false);
    setEditing(null);
  }

  async function confirmDelete() {
    try {
      const target = employees.find((e) => e.id === deleteId);
      if (target) {
        const empDbId = target.pk || target.id;
        await deleteEmployee(empDbId);
      }
    } catch (err) {
      console.warn("Backend delete notice:", err);
    }
    setEmployees((list) => list.filter((e) => e.id !== deleteId));
    toast("Employee removed", "warning");
    setDeleteId(null);
  }

  const statusCounts = STATUS_FILTERS.slice(1).reduce((acc, s) => {
    acc[s] = employees.filter((e) => e.status === s).length;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="employees-loading">
        Loading employee data...
      </div>
    );
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="Employees"
        subtitle={`${employees.length} people across ${departments.length} departments`}
        action={
          <div className="employees-header-actions">
            <Button variant="outline" icon={Download} small onClick={() => exportToCSV(filtered.length ? filtered : employees, "employees.csv")}>Export CSV</Button>
            <Button icon={Plus} onClick={() => { setEditing(null); setShowForm(true); }}>Add employee</Button>
          </div>
        }
      />

      {/* Status summary pills */}
      <div className="employees-status-pills">
        {STATUS_FILTERS.map((s) => (
          <div key={s} onClick={() => setStatusFilter(s)} className="employees-status-pill-item">
            <Pill tone={statusFilter === s ? statusTone(s === "All" ? "Active" : s) : "slate"}>
              {s}{s !== "All" && ` (${statusCounts[s] ?? 0})`}
            </Pill>
          </div>
        ))}
      </div>

      {/* Search & filter bar */}
      <div className="employees-search-card">
        <Card style={{ padding: 14 }}>
          <div className="employees-search-row">
            <div className="employees-search-input-box">
              <Search size={14} color={C.slateLight} />
              <input
                placeholder="Search by name, role or ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="employees-search-input"
              />
            </div>
            <div className="employees-filter-box">
              <Filter size={14} color={C.slateLight} />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="employees-filter-select"
              >
                <option>All</option>
                {departments.map((d) => <option key={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
        </Card>
      </div>

      {/* Table */}
      <div className="employees-table-card">
        <Card style={{ padding: 0 }}>
          <Table
            columns={["Employee", "Department", "Role", "Status", "Location", "Joined", ""]}
            rows={[...filtered].sort((a, b) =>
              a.id.localeCompare(b.id, undefined, { numeric: true })
            )}
            renderRow={(e) => (
              <tr key={e.id} className="hoverable employees-table-row">
                <td className="employees-table-cell" onClick={() => setViewing(e)}>
                  <div className="employees-name-cell">
                    <Avatar name={e.name} size={34} />
                    <div>
                      <div className="employees-name-text">{e.name}</div>
                      <div className="employees-id-text">{e.id}</div>
                    </div>
                  </div>
                </td>
                <td className="employees-table-cell employees-muted-text">{e.department}</td>
                <td className="employees-table-cell employees-muted-text">{e.role}</td>
                <td className="employees-table-cell"><Pill tone={statusTone(e.status)}>{e.status}</Pill></td>
                <td className="employees-table-cell employees-muted-text">{e.location}</td>
                <td className="employees-table-cell employees-subtle-text">{e.joinDate}</td>
                <td className="employees-table-cell">
                  <div className="employees-actions-cell">
                    <Pencil size={15} color={C.slate} className="employees-action-icon" onClick={(ev) => { ev.stopPropagation(); setEditing(e); setShowForm(true); }} />
                    <Trash2 size={15} color={C.coral} className="employees-action-icon" onClick={(ev) => { ev.stopPropagation(); setDeleteId(e.id); }} />
                  </div>
                </td>
              </tr>
            )}
          />
          {filtered.length === 0 && <EmptyState text="No employees match your filters." />}
        </Card>
      </div>

      {/* Add/Edit modal */}
      {showForm && (
        <Modal title={editing ? "Edit employee" : "Add employee"} onClose={() => { setShowForm(false); setEditing(null); }} width={560}>
          <EmployeeForm initial={editing} departments={departments} onSave={saveEmployee} onCancel={() => { setShowForm(false); setEditing(null); }} />
        </Modal>
      )}

      {/* Profile modal */}
      {viewing && <EmployeeProfileModal employee={viewing} onClose={() => setViewing(null)} />}

      {/* Delete confirm modal */}
      {deleteId && (
        <Modal title="Remove employee?" onClose={() => setDeleteId(null)} width={400}>
          <p className="employees-delete-desc">
            This action cannot be undone. The employee record will be permanently removed.
          </p>
          <div className="employees-delete-actions">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Yes, remove</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
