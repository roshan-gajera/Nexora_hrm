import React, { useState } from "react";
import { Bell, ChevronDown } from "lucide-react";
import { C } from "../../constants/theme";
import { Avatar } from "../ui";

export default function EmpTopBar({ onMenu, currentUser }) {
  const [showNotifs, setShowNotifs] = useState(false);

  const NOTIFS = [
    { id: 1, text: "Your Casual Leave request was approved",    time: "1h ago",  dot: C.teal  },
    { id: 2, text: "June 2026 payslip is now available",        time: "2h ago",  dot: C.blue  },
    { id: 3, text: "Company holiday on 15th August",            time: "1d ago",  dot: C.amber },
  ];

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 26px", borderBottom: `1px solid ${C.border}`, background: C.panel, position: "sticky", top: 0, zIndex: 50 }}>

      {/* Left: Greeting */}
      <div>
        <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 16, color: C.ink }}>
          Welcome back{currentUser ? `, ${currentUser.split(" ")[0]}` : ""} 👋
        </span>
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>

        {/* Notifications */}
        <div style={{ position: "relative" }}>
          <div onClick={() => setShowNotifs((v) => !v)} style={{ cursor: "pointer", position: "relative", display: "flex" }}>
            <Bell size={19} color={C.slate} />
            <span style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: "50%", background: C.coral }} />
          </div>

          {showNotifs && (
            <div style={{ position: "absolute", top: "calc(100% + 12px)", right: 0, width: 320, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 8px 30px rgba(20,33,61,0.12)", zIndex: 200, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, color: C.ink }}>
                Notifications
              </div>
              {NOTIFS.map((n) => (
                <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: n.dot, marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.ink, lineHeight: 1.4 }}>{n.text}</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.slateLight, marginTop: 3 }}>{n.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
          <Avatar name={currentUser || "Employee"} size={32} />
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: C.ink }}>{currentUser}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.slateLight }}>Employee</div>
          </div>
          <ChevronDown size={14} color={C.slateLight} />
        </div>
      </div>
    </div>
  );
}
