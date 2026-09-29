import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

import { C } from "./constants/theme";
import { ToastProvider } from "./context/ToastContext";
import { getCurrentStoredUser, logoutApi } from "./api/auth";

import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";

import LoginPage      from "./pages/LoginPage";
import SignupPage     from "./pages/SignupPage";
import DashboardPage  from "./pages/DashboardPage";
import EmployeesPage  from "./pages/EmployeesPage";
import AttendancePage from "./pages/AttendancePage";
import LeavePage      from "./pages/LeavePage";
import PayrollPage    from "./pages/PayrollPage";
import DepartmentsPage  from "./pages/DepartmentsPage";
import RecruitmentPage  from "./pages/RecruitmentPage";
import PerformancePage  from "./pages/PerformancePage";
import SettingsPage   from "./pages/SettingsPage";
import SubscriptionPage from "./pages/SubscriptionPage";

import EmpDashboardPage from "./pages/EmpDashboardPage";
import EmpLeavePage     from "./pages/EmpLeavePage";
import EmpPayslipsPage  from "./pages/EmpPayslipsPage";

function useFonts() {
  useEffect(() => {
    const id = "nexora-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id   = id;
    link.rel  = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";
    document.head.appendChild(link);
  }, []);
}

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const [authed, setAuthed] = useState(
    () => !!localStorage.getItem("nexora_access_token")
  );

  const [user, setUser] = useState(
    () => getCurrentStoredUser()
  );

  const [sidebarOpen, setSidebarOpen] = useState(true);

  /*
   * Get current page from browser URL.
   * Example: /dashboard -> dashboard
   */
  const page = location.pathname.split("/")[1] || (user?.role === "employee" ? "emp-dashboard" : "dashboard");

  /*
   * Replaces old useState-based setPage().
   * Example: setPage("employees") -> navigates to /employees
   */
  const setPage = (newPage) => {
    navigate(`/${newPage}`);
  };

  /* LOGIN */
  const handleLogin = (userData) => {
    const loggedUser = userData || getCurrentStoredUser();
    setUser(loggedUser);
    setAuthed(true);
    if (loggedUser?.role === "employee") {
      navigate("/emp-dashboard");
    } else {
      navigate("/dashboard");
    }
  };

  /* LOGOUT */
  const handleLogout = async () => {
    await logoutApi();
    setUser(null);
    setAuthed(false);
    navigate("/login");
  };

  /* NOT AUTHENTICATED */
  if (!authed) {
    return (
      <Routes>
        <Route
          path="/login"
          element={
            <LoginPage
              onLogin={handleLogin}
              onNavigateSignup={() => navigate("/signup")}
            />
          }
        />
        <Route
          path="/signup"
          element={
            <SignupPage
              onSignup={handleLogin}
              onNavigateLogin={() => navigate("/login")}
            />
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const currentUserName = user
    ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email
    : "Priya Nair";

  const defaultRoute = user?.role === "employee" ? "/emp-dashboard" : "/dashboard";

  return (
    <div style={{ display: "flex", background: C.canvas, minHeight: "100vh" }}>
      {/* SIDEBAR */}
      <Sidebar
        page={page}
        setPage={setPage}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        onLogout={handleLogout}
        user={user}
      />

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* TOP BAR */}
        <TopBar
          onMenu={() => setSidebarOpen((o) => !o)}
          currentUser={currentUserName}
          userRole={user?.role}
          setPage={setPage}
        />

        {/* PAGE CONTENT */}
        <div style={{ padding: 26, flex: 1 }}>
          <Routes>

            {/* DASHBOARD */}
            <Route
              path="/dashboard" element={<DashboardPage setPage={setPage} />}
            />

            {/* EMPLOYEES */}
            <Route
              path="/employees" element={<EmployeesPage />}
            />

            {/* ATTENDANCE */}
            <Route
              path="/attendance" element={<AttendancePage />}
            />

            {/* LEAVE */}
            <Route
              path="/leave" element={<LeavePage />}
            />

            {/* PAYROLL */}
            <Route
              path="/payroll" element={<PayrollPage />}
            />

            {/* DEPARTMENTS */}
            <Route
              path="/departments"
              element={<DepartmentsPage />}
            />

            {/* RECRUITMENT */}
            <Route
              path="/recruitment"
              element={<RecruitmentPage />}
            />

            {/* PERFORMANCE */}
            <Route
              path="/performance"
              element={<PerformancePage />}
            />

            {/* SETTINGS */}
            <Route
              path="/settings"
              element={<SettingsPage />}
            />

            {/* SUBSCRIPTION */}
            <Route path="/subscription" element={<SubscriptionPage />} />

            {/* EMPLOYEE PORTAL ROUTES */}
            <Route path="/emp-dashboard" element={<EmpDashboardPage setPage={setPage} user={user} />} />
            <Route path="/emp-leave" element={<EmpLeavePage user={user} />} />
            <Route path="/emp-payslips" element={<EmpPayslipsPage user={user} />} />

            {/* UNKNOWN URL -> redirect to default dashboard */}
            <Route path="*" element={<Navigate to={defaultRoute} replace />} />

          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  useFonts();

  return (
    <BrowserRouter>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </BrowserRouter>
  );
}