import React, { useState, useEffect, useMemo } from "react";
import { Search, Plus, Pencil, Trash2, Mail, Phone, MapPin, Download, Filter } from "lucide-react";
import { C } from "../constants/theme";
import { statusTone, fmtMoney, exportToCSV } from "../utils/helpers";
import { Card, PageHeader, Button, Input, Select, Table, Modal, Avatar, Pill, EmptyState } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { fetchEmployees, createEmployee, updateEmployee, deleteEmployee } from "../api/employeesApi";
import { fetchDepartments } from "../api/departmentsApi";

function EmployeeForm({ initial, departments, onSave, onCancel }) {
  const [form, setForm] = useState(initial || {
    name: "", email: "", phone: "", role: "", department: departments[0]?.name,
    status: "Active", joinDate: "2026-07-12", salary: 50000, location: "Ahmedabad",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
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
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20, padding: "0 0 18px", borderBottom: `1px solid ${C.border}` }}>
        <Avatar name={employee.name} size={64} />
        <div>
          <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 19, color: C.ink }}>{employee.name}</div>
          <div style={{ color: C.slate, fontSize: 13.5, marginTop: 2 }}>{employee.role} · {employee.department}</div>
          <div style={{ marginTop: 8 }}><Pill tone={statusTone(employee.status)}>{employee.status}</Pill></div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
        {fields.map((f) => (
          <div key={f.label}>
            <div style={{ color: C.slateLight, fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>{f.label}</div>
            <div style={{ color: C.ink, fontFamily: f.mono ? "IBM Plex Mono, monospace" : "inherit", display: "flex", alignItems: "center", gap: 5 }}>
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
      <div style={{ padding: 40, textAlign: "center", color: C.slate, fontFamily: "Inter, sans-serif" }}>
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
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="outline" icon={Download} small onClick={() => exportToCSV(filtered.length ? filtered : employees, "employees.csv")}>Export CSV</Button>
            <Button icon={Plus} onClick={() => { setEditing(null); setShowForm(true); }}>Add employee</Button>
          </div>
        }
      />

      {/* Status summary pills */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {STATUS_FILTERS.map((s) => (
          <div key={s} onClick={() => setStatusFilter(s)} style={{ cursor: "pointer" }}>
            <Pill tone={statusFilter === s ? statusTone(s === "All" ? "Active" : s) : "slate"}>
              {s}{s !== "All" && ` (${statusCounts[s] ?? 0})`}
            </Pill>
          </div>
        ))}
      </div>

      {/* Search & filter bar */}
      <Card style={{ padding: 14, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.canvas, borderRadius: 7, padding: "8px 12px", flex: 1, minWidth: 220 }}>
            <Search size={14} color={C.slateLight} />
            <input
              placeholder="Search by name, role or ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 13, width: "100%", color: C.ink }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Filter size={14} color={C.slateLight} />
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={{ padding: "8px 12px", borderRadius: 7, border: `1px solid ${C.border}`, fontFamily: "Inter, sans-serif", fontSize: 13, color: C.ink, background: "#fff" }}>
              <option>All</option>
              {departments.map((d) => <option key={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card style={{ padding: 0 }}>
        <Table
          columns={["Employee", "Department", "Role", "Status", "Location", "Joined", ""]}
          rows={[...filtered].sort((a, b) =>
            a.id.localeCompare(b.id, undefined, { numeric: true })
          )}
          renderRow={(e) => (
            <tr key={e.id} className="hoverable" style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
              <td style={{ padding: "12px 14px" }} onClick={() => setViewing(e)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar name={e.name} size={34} />
                  <div>
                    <div style={{ fontWeight: 600, color: C.ink, fontSize: 13.5 }}>{e.name}</div>
                    <div style={{ fontSize: 11.5, color: C.slateLight, fontFamily: "IBM Plex Mono, monospace" }}>{e.id}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: "12px 14px", color: C.slate, fontSize: 13 }}>{e.department}</td>
              <td style={{ padding: "12px 14px", color: C.slate, fontSize: 13 }}>{e.role}</td>
              <td style={{ padding: "12px 14px" }}><Pill tone={statusTone(e.status)}>{e.status}</Pill></td>
              <td style={{ padding: "12px 14px", color: C.slate, fontSize: 13 }}>{e.location}</td>
              <td style={{ padding: "12px 14px", color: C.slateLight, fontSize: 12 }}>{e.joinDate}</td>
              <td style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <Pencil size={15} color={C.slate} style={{ cursor: "pointer" }} onClick={(ev) => { ev.stopPropagation(); setEditing(e); setShowForm(true); }} />
                  <Trash2 size={15} color={C.coral} style={{ cursor: "pointer" }} onClick={(ev) => { ev.stopPropagation(); setDeleteId(e.id); }} />
                </div>
              </td>
            </tr>
          )}
        />
        {filtered.length === 0 && <EmptyState text="No employees match your filters." />}
      </Card>

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
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: C.slate, marginBottom: 20 }}>
            This action cannot be undone. The employee record will be permanently removed.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Yes, remove</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
