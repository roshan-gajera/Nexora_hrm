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
import { ToastProvider, useToast } from "./context/ToastContext";
import { getCurrentStoredUser, logoutApi } from "./api/auth";
import { clearTokens } from "./api/apiClient";

import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";

import LoginPage      from "./pages/LoginPage";
import SignupPage     from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage  from "./pages/ResetPasswordPage";
import DashboardPage  from "./pages/DashboardPage";
import EmployeesPage  from "./pages/EmployeesPage";
import AttendancePage from "./pages/AttendancePage";
import LeavePage      from "./pages/LeavePage";
import PayrollPage    from "./pages/PayrollPage";
import DepartmentsPage  from "./pages/DepartmentsPage";
import RecruitmentPage  from "./pages/RecruitmentPage";
import SettingsPage   from "./pages/SettingsPage";
import SubscriptionPage from "./pages/SubscriptionPage";

import EmpDashboardPage  from "./pages/EmpDashboardPage";
import EmpAttendancePage from "./pages/EmpAttendancePage";
import EmpLeavePage      from "./pages/EmpLeavePage";
import EmpPayslipsPage   from "./pages/EmpPayslipsPage";

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
  const [resetEmail, setResetEmail] = useState("");
  const toast = useToast();

  const isEmployee = user?.role === "employee";
  const defaultRoute = isEmployee ? "/emp-dashboard" : "/dashboard";

  /*
   * Get current page from browser URL.
   * Example: /dashboard -> dashboard
   */
  const page = location.pathname.split("/")[1] || (isEmployee ? "emp-dashboard" : "dashboard");

  /* ROUTE GUARD: Prevent cross-role direct URL navigation */
  useEffect(() => {
    if (!authed || !user) return;

    const currentPath = location.pathname;
    const isEmp = user?.role === "employee";

    const adminRoutes = [
      "/dashboard",
      "/employees",
      "/attendance",
      "/leave",
      "/payroll",
      "/departments",
      "/recruitment",
      "/settings",
      "/subscription",
    ];

    if (!isEmp && currentPath.startsWith("/emp-")) {
      toast?.("Access restricted: Admins cannot access the employee portal directly.", "error");
      navigate("/dashboard", { replace: true });
    } else if (isEmp && adminRoutes.some((r) => currentPath.startsWith(r))) {
      toast?.("Access restricted: Employees cannot access administrative panels.", "error");
      navigate("/emp-dashboard", { replace: true });
    }
  }, [location.pathname, authed, user, navigate, toast]);

  /* AUTH LISTENER: Listen for global logout events */
  useEffect(() => {
    const handleLogoutEvent = () => {
      setUser(null);
      setAuthed(false);
      navigate("/login", { replace: true });
    };
    window.addEventListener("nexora:logout", handleLogoutEvent);
    return () => window.removeEventListener("nexora:logout", handleLogoutEvent);
  }, [navigate]);

  /* SERVER CONNECTION MONITOR: Auto-logout if server closes or restarts */
  useEffect(() => {
    if (!authed) return;

    let isMounted = true;
    const checkServerHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch("http://127.0.0.1:8000/api/health/", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error("Server unhealthy");
        }

        const data = await res.json().catch(() => ({}));
        if (data.server_session) {
          const storedSession = sessionStorage.getItem("nexora_server_session");
          if (!storedSession) {
            sessionStorage.setItem("nexora_server_session", data.server_session);
          } else if (storedSession !== data.server_session) {
            if (isMounted) {
              clearTokens();
              toast?.("Server was restarted. You have been automatically logged out.", "info");
            }
          }
        }
      } catch {
        if (isMounted) {
          clearTokens();
          toast?.("Server connection closed. You have been automatically logged out.", "error");
        }
      }
    };

    const interval = setInterval(checkServerHealth, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [authed, toast]);


  const setPage = (newPage) => {
    navigate(`/${newPage}`);
  };

  /* LOGIN */
  const handleLogin = (userData) => {
    sessionStorage.removeItem("nexora_server_session");
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
              onNavigateForgot={() => navigate("/forgot-password")}
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
        <Route
          path="/forgot-password"
          element={
            <ForgotPasswordPage
              onNavigateLogin={() => navigate("/login")}
              onNavigateReset={(email) => {
                setResetEmail(email);
                navigate("/reset-password");
              }}
            />
          }
        />
        <Route
          path="/reset-password"
          element={
            <ResetPasswordPage
              email={resetEmail}
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
            {isEmployee ? (
              <>
                {/* EMPLOYEE ROUTES */}
                <Route path="/emp-dashboard" element={<EmpDashboardPage setPage={setPage} user={user} />} />
                <Route path="/emp-attendance" element={<EmpAttendancePage user={user} />} />
                <Route path="/emp-leave" element={<EmpLeavePage user={user} />} />
                <Route path="/emp-payslips" element={<EmpPayslipsPage user={user} />} />

                <Route path="*" element={<Navigate to="/emp-dashboard" replace />} />
              </>
            ) : (
              <>
                {/* ADMIN ROUTES */}
                <Route path="/dashboard" element={<DashboardPage setPage={setPage} />} />
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/attendance" element={<AttendancePage />} />
                <Route path="/leave" element={<LeavePage />} />
                <Route path="/payroll" element={<PayrollPage />} />
                <Route path="/departments" element={<DepartmentsPage />} />
                <Route path="/recruitment" element={<RecruitmentPage />} />
                <Route path="/settings" element={<SettingsPage user={user} onUpdateUser={setUser} />} />
                <Route path="/subscription" element={<SubscriptionPage />} />

                {/* Catch-all for Admin -> redirect to admin dashboard */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </>
            )}
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