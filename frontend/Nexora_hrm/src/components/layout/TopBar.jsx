import React, { useState, useRef, useEffect } from "react";
import { Search, Bell, ChevronDown } from "lucide-react";
import { C } from "../../constants/theme";
import { Avatar } from "../ui";

export default function TopBar({ onMenu, currentUser, employees = [], setPage }) {
  const [query,       setQuery]       = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showNotifs,  setShowNotifs]  = useState(false);
  const searchRef = useRef(null);

  const results = query.trim().length > 1
    ? employees.filter((e) =>
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.role.toLowerCase().includes(query.toLowerCase()) ||
        e.department.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : [];

  useEffect(() => {
    function handler(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const NOTIFS = [
    { id: 1, text: "Rahul Sharma applied for Casual Leave",   time: "2m ago",  dot: C.amber },
    { id: 2, text: "Payroll for June 2026 is ready to run",   time: "1h ago",  dot: C.teal  },
    { id: 3, text: "New applicant for Senior Frontend role",   time: "3h ago",  dot: C.blue  },
    { id: 4, text: "Performance review cycle starts Monday",   time: "1d ago",  dot: C.coral },
  ];

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 26px", borderBottom: `1px solid ${C.border}`, background: C.panel, position: "sticky", top: 0, zIndex: 50 }}>

      {/* Search */}
      <div ref={searchRef} style={{ position: "relative", width: 300 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.canvas, borderRadius: 8, padding: "8px 12px" }}>
          <Search size={14} color={C.slateLight} />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            placeholder="Search employees, departments..."
            style={{ border: "none", background: "transparent", outline: "none", fontFamily: "Inter, sans-serif", fontSize: 13, width: "100%", color: C.ink }}
          />
        </div>

        {showResults && results.length > 0 && (
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 8px 30px rgba(20,33,61,0.12)", zIndex: 200, overflow: "hidden" }}>
            {results.map((e) => (
              <div
                key={e.id}
                onClick={() => { setPage("employees"); setQuery(""); setShowResults(false); }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${C.border}` }}
                onMouseEnter={(el) => el.currentTarget.style.background = C.canvas}
                onMouseLeave={(el) => el.currentTarget.style.background = "transparent"}
              >
                <Avatar name={e.name} size={28} />
                <div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: C.ink }}>{e.name}</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: C.slateLight }}>{e.role} · {e.department}</div>
                </div>
              </div>
            ))}
          </div>
        )}
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
              <div style={{ padding: "10px 16px", textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 12.5, color: C.teal, cursor: "pointer", fontWeight: 600 }}>
                View all notifications
              </div>
            </div>
          )}
        </div>

        {/* User */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
          <Avatar name={currentUser} size={32} />
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: C.ink }}>{currentUser}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.slateLight }}>HR Administrator</div>
          </div>
          <ChevronDown size={14} color={C.slateLight} />
        </div>
      </div>
    </div>
  );
}
