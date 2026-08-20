import React, { useState, useEffect } from "react";
import { C } from "./constants/theme";
import { genEmployees, genLeaves, genAttendance, genPayroll, genReviews, genCandidates, DEPARTMENTS, JOBS_SEED } from "./data/mockData";
import { ToastProvider } from "./context/ToastContext";
import { getCurrentStoredUser, logoutApi } from "./api/auth";
import {
  fetchEmployees, fetchDepartments, fetchLeaves, fetchAttendance,
  fetchPayroll, fetchJobs, fetchCandidates, fetchPerformanceReviews
} from "./api/hrmApi";

import Sidebar  from "./components/layout/Sidebar";
import TopBar   from "./components/layout/TopBar";

import LoginPage       from "./pages/LoginPage";
import SignupPage      from "./pages/SignupPage";
import DashboardPage   from "./pages/DashboardPage";
import EmployeesPage   from "./pages/EmployeesPage";
import AttendancePage  from "./pages/AttendancePage";
import LeavePage       from "./pages/LeavePage";
import PayrollPage     from "./pages/PayrollPage";
import DepartmentsPage from "./pages/DepartmentsPage";
import RecruitmentPage from "./pages/RecruitmentPage";
import PerformancePage from "./pages/PerformancePage";
import SettingsPage    from "./pages/SettingsPage";

const EMPLOYEES_SEED = genEmployees(24);

function useFonts() {
  useEffect(() => {
    const id = "nexora-fonts";
    if (document.getElementById(id)) return;
    const link  = document.createElement("link");
    link.id     = id;
    link.rel    = "stylesheet";
    link.href   = "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";
    document.head.appendChild(link);
  }, []);
}

function AppShell() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem("nexora_access_token"));
  const [authMode, setAuthMode] = useState("login");
  const [user, setUser] = useState(() => getCurrentStoredUser());
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleLogin = (userData) => {
    setUser(userData || getCurrentStoredUser());
    setAuthed(true);
  };

  const handleLogout = async () => {
    await logoutApi();
    setUser(null);
    setAuthed(false);
  };

  useEffect(() => {
    if (!authed) return;

    let isMounted = true;
    setLoading(true);

    async function loadData() {
      try {
        const [empRes, deptRes, leaveRes, attRes, payRes, jobRes, candRes, revRes] = await Promise.allSettled([
          fetchEmployees(),
          fetchDepartments(),
          fetchLeaves(),
          fetchAttendance(),
          fetchPayroll(),
          fetchJobs(),
          fetchCandidates(),
          fetchPerformanceReviews(),
        ]);

        if (!isMounted) return;

        if (empRes.status === "fulfilled") {
          const items = Array.isArray(empRes.value) ? empRes.value : (empRes.value?.results || []);
          setEmployees(items);
        }
        if (deptRes.status === "fulfilled") {
          const items = Array.isArray(deptRes.value) ? deptRes.value : (deptRes.value?.results || []);
          setDepartments(items);
        }
        if (leaveRes.status === "fulfilled") {
          const items = Array.isArray(leaveRes.value) ? leaveRes.value : (leaveRes.value?.results || []);
          setLeaves(items);
        }
        if (attRes.status === "fulfilled") {
          const items = Array.isArray(attRes.value) ? attRes.value : (attRes.value?.results || []);
          setAttendance(items);
        }
        if (payRes.status === "fulfilled") {
          const items = Array.isArray(payRes.value) ? payRes.value : (payRes.value?.results || []);
          setPayroll(items);
        }
        if (jobRes.status === "fulfilled") {
          const items = Array.isArray(jobRes.value) ? jobRes.value : (jobRes.value?.results || []);
          setJobs(items);
        }
        if (candRes.status === "fulfilled") {
          const items = Array.isArray(candRes.value) ? candRes.value : (candRes.value?.results || []);
          setCandidates(items);
        }
        if (revRes.status === "fulfilled") {
          const items = Array.isArray(revRes.value) ? revRes.value : (revRes.value?.results || []);
          setReviews(items);
        }
      } catch (err) {
        console.warn("Error loading database records:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [authed]);

  if (!authed) {
    if (authMode === "signup") {
      return <SignupPage onSignup={handleLogin} onNavigateLogin={() => setAuthMode("login")} />;
    }
    return <LoginPage onLogin={handleLogin} onNavigateSignup={() => setAuthMode("signup")} />;
  }

  const currentUserName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email
    : "Priya Nair";

  const pages = {
    dashboard:   <DashboardPage   employees={employees} leaves={leaves} attendance={attendance} departments={departments} setPage={setPage} />,
    employees:   <EmployeesPage   employees={employees} setEmployees={setEmployees} departments={departments} />,
    attendance:  <AttendancePage  attendance={attendance} />,
    leave:       <LeavePage       leaves={leaves} setLeaves={setLeaves} employees={employees} />,
    payroll:     <PayrollPage     payroll={payroll} setPayroll={setPayroll} />,
    departments: <DepartmentsPage departments={departments} employees={employees} />,
    recruitment: <RecruitmentPage jobs={jobs} candidates={candidates} />,
    performance: <PerformancePage reviews={reviews} />,
    settings:    <SettingsPage />,
  };

  return (
    <div style={{ display: "flex", background: C.canvas, minHeight: "100vh" }}>
      <Sidebar
        page={page}
        setPage={setPage}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        onLogout={handleLogout}
      />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <TopBar
          onMenu={() => setSidebarOpen((o) => !o)}
          currentUser={currentUserName}
          employees={employees}
          setPage={setPage}
        />
        <div style={{ padding: 26, flex: 1 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: C.slate, fontFamily: "Inter, sans-serif" }}>
              Loading workspace data from backend...
            </div>
          ) : (
            pages[page] ?? pages.dashboard
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  useFonts();
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}
