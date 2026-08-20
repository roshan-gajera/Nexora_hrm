import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { C } from "../../constants/theme";
import { avatarColor, initials } from "../../utils/helpers";

export function Pill({ tone = "slate", children }) {
  const map = {
    teal:  { bg: C.tealSoft,  fg: C.teal  },
    amber: { bg: C.amberSoft, fg: C.amber },
    coral: { bg: C.coralSoft, fg: C.coral },
    blue:  { bg: C.blueSoft,  fg: C.blue  },
    slate: { bg: "#EEF1F5",   fg: C.slate },
  };
  const t = map[tone] || map.slate;
  return (
    <span style={{ background: t.bg, color: t.fg, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

export function Avatar({ name, size = 36 }) {
  const c = avatarColor(name);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: c.bg, color: c.fg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
      {initials(name)}
    </div>
  );
}

export function Card({ children, style, accent }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderLeft: accent ? `4px solid ${accent}` : `1px solid ${C.border}`, borderRadius: 10, padding: 20, ...style }}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h1 style={{ fontFamily: "Sora, sans-serif", fontSize: 24, fontWeight: 700, color: C.ink, margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontFamily: "Inter, sans-serif", color: C.slate, fontSize: 13.5, margin: "4px 0 0" }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Button({ children, onClick, variant = "primary", icon: Icon, small, type = "button" }) {
  const styles = {
    primary: { background: C.ink,      color: "#fff",    border: `1px solid ${C.ink}`      },
    outline: { background: "transparent", color: C.ink,  border: `1px solid ${C.border}`   },
    ghost:   { background: "transparent", color: C.slate, border: "1px solid transparent"  },
    danger:  { background: C.coralSoft, color: C.coral,  border: `1px solid ${C.coralSoft}` },
    teal:    { background: C.teal,      color: "#fff",    border: `1px solid ${C.teal}`     },
  };
  return (
    <button type={type} onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: small ? 12.5 : 13.5, padding: small ? "6px 12px" : "9px 16px", borderRadius: 7, cursor: "pointer", ...styles[variant] }}>
      {Icon && <Icon size={small ? 14 : 15} />}
      {children}
    </button>
  );
}

export function Input({ label, ...props }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      {label && <span style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: C.slate, marginBottom: 5 }}>{label}</span>}
      <input {...props} style={{ width: "100%", boxSizing: "border-box", fontFamily: "Inter, sans-serif", fontSize: 14, padding: "9px 12px", borderRadius: 7, border: `1px solid ${C.border}`, outline: "none", color: C.ink }} />
    </label>
  );
}

export function Select({ label, options, ...props }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      {label && <span style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: C.slate, marginBottom: 5 }}>{label}</span>}
      <select {...props} style={{ width: "100%", boxSizing: "border-box", fontFamily: "Inter, sans-serif", fontSize: 14, padding: "9px 12px", borderRadius: 7, border: `1px solid ${C.border}`, outline: "none", color: C.ink, background: "#fff" }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

export function Table({ columns, rows, renderRow }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} style={{ textAlign: "left", padding: "10px 14px", color: C.slateLight, fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${C.border}` }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{rows.map(renderRow)}</tbody>
      </table>
    </div>
  );
}

export function Modal({ title, onClose, children, width = 480 }) {
  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(20,33,61,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 12, width, maxWidth: "calc(100vw - 32px)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(20,33,61,0.28)", display: "flex", flexDirection: "column" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <h3 style={{ fontFamily: "Sora, sans-serif", fontSize: 17, fontWeight: 700, color: C.ink, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.slate, display: "flex", alignItems: "center" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 22, overflowY: "auto" }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function EmptyState({ text }) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center", color: C.slateLight, fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
      {text}
    </div>
  );
}

export function StatCard({ label, value, delta, positive, icon: Icon, accent }) {
  const ArrowUp   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>;
  const ArrowDown = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="7" y1="7" x2="17" y2="17"/><polyline points="17 7 17 17 7 17"/></svg>;
  return (
    <Card accent={accent} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.slate, fontWeight: 600 }}>{label}</span>
        <div style={{ width: 30, height: 30, borderRadius: 7, background: C.canvas, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={15} color={accent} />
        </div>
      </div>
      <div style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: C.ink }}>{value}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: positive ? C.teal : C.coral }}>
        {positive ? <ArrowUp /> : <ArrowDown />}
        {delta}
      </div>
    </Card>
  );
}
