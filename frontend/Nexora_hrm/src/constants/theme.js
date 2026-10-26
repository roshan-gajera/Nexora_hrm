import {
  LayoutDashboard, Users, CalendarCheck, CalendarDays,
  Wallet, Building2, Briefcase, Settings, CreditCard,
  FileText,
} from "lucide-react";

export const C = {
  ink:        "#14213D",
  inkSoft:    "#1E2E52",
  canvas:     "#F4F6F9",
  panel:      "#FFFFFF",
  border:     "#E2E7EF",
  slate:      "#5C6B7A",
  slateLight: "#8A97A6",
  teal:       "#1F8A70",
  tealSoft:   "#E4F3EF",
  amber:      "#B9790A",
  amberSoft:  "#FBF0DC",
  coral:      "#C4432F",
  coralSoft:  "#FBE7E3",
  blue:       "#2A5C9A",
  blueSoft:   "#f7e6e6ff",
};

export const AVATAR_PALETTE = [
  { bg: "#E4F3EF", fg: "#1F8A70" },
  { bg: "#E6EEF7", fg: "#2A5C9A" },
  { bg: "#FBF0DC", fg: "#B9790A" },
  { bg: "#FBE7E3", fg: "#C4432F" },
  { bg: "#EFE8F7", fg: "#6B46A8" },
  { bg: "#E8F4FB", fg: "#1471A8" },
];

export const NAV = [
  { key: "dashboard",   label: "Dashboard",   icon: LayoutDashboard },
  { key: "subscription", label: "Subscription", icon: CreditCard},
  { key: "employees",   label: "Employees",   icon: Users },
  { key: "attendance",  label: "Attendance",  icon: CalendarCheck },
  { key: "leave",       label: "Leave",       icon: CalendarDays },
  { key: "payroll",     label: "Payroll",     icon: Wallet },
  { key: "departments", label: "Departments", icon: Building2 },
  { key: "recruitment", label: "Recruitment", icon: Briefcase },
  { key: "settings",    label: "Settings",    icon: Settings },
];

export const EMP_NAV = [
  { key: "emp-dashboard",  label: "Dashboard",     icon: LayoutDashboard },
  { key: "emp-attendance", label: "My Attendance", icon: CalendarCheck },
  { key: "emp-leave",      label: "My Leaves",     icon: CalendarDays },
  { key: "emp-payslips",   label: "My Payslips",   icon: FileText },
];
