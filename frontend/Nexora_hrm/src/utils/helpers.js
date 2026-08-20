import { AVATAR_PALETTE } from "../constants/theme";

export function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function initials(name) {
  const parts = name.trim().split(" ");
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

export function avatarColor(name) {
  return AVATAR_PALETTE[hashStr(name) % AVATAR_PALETTE.length];
}

export function fmtMoney(n) {
  const num = Number(n) || 0;
  return "₹" + num.toLocaleString("en-US");
}

export function statusTone(status) {
  switch (status) {
    case "Active": case "Approved": case "Present": case "Paid":
    case "Completed": case "Hired": case "Open":
      return "teal";
    case "On Leave": case "Pending": case "Late": case "WFH":
    case "Screening": case "Interview": case "Applied":
      return "amber";
    case "Inactive": case "Rejected": case "Absent": case "Closed":
      return "coral";
    default:
      return "slate";
  }
}

export function exportToCSV(data, filename = "export.csv") {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [];
  csvRows.push(headers.join(","));

  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header];
      const str = typeof val === "object" && val !== null ? JSON.stringify(val) : ("" + (val ?? ""));
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  }

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
