import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Search, Bell, CheckCheck, X } from "lucide-react";
import { C } from "../../constants/theme";
import { Avatar } from "../ui";
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../api/notificationsApi";

import { fetchEmployees } from "../../api/employeesApi";

// Tone → colour mapping (matches backend tone field values)
const toneColor = {
  teal:   C.teal,
  amber:  C.amber,
  coral:  C.coral,
  blue:   C.blue,
  slate:  C.slate,
  purple: "#6B46A8",
};

const POLL_INTERVAL = 15_000; // 15 s

export default function TopBar({ onMenu, currentUser, userRole, employees: propEmployees = [], setPage }) {
  const location = useLocation();
  const isEmpPortal = userRole === "employee" || location.pathname.startsWith("/emp-");

  const [query,        setQuery]        = useState("");
  const [showResults,  setShowResults]  = useState(false);
  const [showNotifs,   setShowNotifs]   = useState(false);
  const [notifications, setNotifs]      = useState([]);
  const [unread,        setUnread]      = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [localEmployees, setLocalEmployees] = useState([]);

  const searchRef  = useRef(null);
  const notifsRef  = useRef(null);
  const pollRef    = useRef(null);

  const empList = propEmployees.length > 0 ? propEmployees : localEmployees;

  const onSearchFocus = async () => {
    setShowResults(true);
    if (propEmployees.length === 0 && localEmployees.length === 0) {
      try {
        const data = await fetchEmployees();
        const list = Array.isArray(data) ? data : (data.results ?? []);
        setLocalEmployees(list);
      } catch (_) {}
    }
  };

  const results = query.trim().length > 1
    ? empList.filter((e) =>
        (e.name || "").toLowerCase().includes(query.toLowerCase()) ||
        (e.role || "").toLowerCase().includes(query.toLowerCase()) ||
        (e.department || "").toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : [];

  // ── Poll unread count in background (admin portal only) ─────────────────
  const refreshUnreadCount = useCallback(async () => {
    if (isEmpPortal) return;
    try {
      const data = await fetchUnreadCount();
      setUnread(data.unread ?? 0);
    } catch (_) { /* silent – token may not be set yet */ }
  }, [isEmpPortal]);

  useEffect(() => {
    if (isEmpPortal) return;
    refreshUnreadCount();
    pollRef.current = setInterval(refreshUnreadCount, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [refreshUnreadCount, isEmpPortal]);

  // ── Load full list when panel opens ──────────────────────────────────────
  const openNotifs = async () => {
    setShowNotifs((v) => {
      if (v) return false; // toggle off
      return true;
    });
    setLoadingNotifs(true);
    try {
      const data = await fetchNotifications();
      setNotifs(Array.isArray(data) ? data : (data.results ?? []));
    } catch (_) {}
    finally { setLoadingNotifs(false); }
  };

  // ── Mark single notification read ────────────────────────────────────────
  const handleMarkRead = async (notif) => {
    if (notif.is_read) return;
    try {
      await markNotificationRead(notif.id);
      setNotifs((prev) => prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnread((u) => Math.max(0, u - 1));
    } catch (_) {}
    if (notif.link) {
      setPage(notif.link);
      setShowNotifs(false);
    }
  };

  // ── Mark all read ─────────────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch (_) {}
  };

  // ── Close panels on outside click ─────────────────────────────────────────
  useEffect(() => {
    function handler(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowResults(false);
      if (notifsRef.current && !notifsRef.current.contains(e.target)) setShowNotifs(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 26px", borderBottom: `1px solid ${C.border}`,
      background: C.panel, position: "sticky", top: 0, zIndex: 50,
    }}>

      {/* Search */}
      <div ref={searchRef} style={{ position: "relative", width: 300 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.canvas, borderRadius: 8, padding: "8px 12px" }}>
          <Search size={14} color={C.slateLight} />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
            onFocus={onSearchFocus}
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

        {/* ── Notifications bell (hidden in Employee Portal) ── */}
        {!isEmpPortal && (
          <div ref={notifsRef} style={{ position: "relative" }}>
            <div
              onClick={openNotifs}
              style={{ cursor: "pointer", position: "relative", display: "flex" }}
              title="Notifications"
            >
              <Bell size={19} color={C.slate} />
              {unread > 0 && (
                <span style={{
                  position: "absolute", top: -5, right: -6,
                  background: C.coral, color: "#fff",
                  fontSize: 10, fontWeight: 700,
                  minWidth: 16, height: 16,
                  borderRadius: 9999, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  padding: "0 3px", lineHeight: 1,
                }}>
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </div>

            {showNotifs && (
              <div style={{
                position: "absolute", top: "calc(100% + 12px)", right: 0, width: 340,
                background: "#fff", border: `1px solid ${C.border}`,
                borderRadius: 14, boxShadow: "0 12px 40px rgba(20,33,61,0.13)",
                zIndex: 200, overflow: "hidden",
              }}>
                {/* Header */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "13px 16px", borderBottom: `1px solid ${C.border}`,
                }}>
                  <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, color: C.ink }}>
                    Notifications {unread > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.coral, marginLeft: 4 }}>
                        {unread} new
                      </span>
                    )}
                  </span>
                  {unread > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: C.teal, fontSize: 11.5, fontWeight: 600, fontFamily: "Inter, sans-serif" }}
                      title="Mark all as read"
                    >
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  )}
                </div>

                {/* Body */}
                <div style={{ maxHeight: 360, overflowY: "auto" }}>
                  {loadingNotifs ? (
                    <div style={{ padding: "24px 16px", textAlign: "center", color: C.slateLight, fontSize: 13, fontFamily: "Inter, sans-serif" }}>
                      Loading…
                    </div>
                  ) : notifications.length === 0 ? (
                    <div style={{ padding: "32px 16px", textAlign: "center", color: C.slateLight, fontSize: 13, fontFamily: "Inter, sans-serif" }}>
                      <Bell size={28} color={C.border} style={{ marginBottom: 8 }} />
                      <p style={{ margin: 0 }}>No notifications yet.</p>
                      <p style={{ margin: "4px 0 0", fontSize: 11.5 }}>Events like leave requests, payroll, and attendance will appear here.</p>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const dot = toneColor[n.tone] ?? C.blue;
                      return (
                        <div
                          key={n.id}
                          onClick={() => handleMarkRead(n)}
                          style={{
                            display: "flex", alignItems: "flex-start", gap: 10,
                            padding: "12px 16px", borderBottom: `1px solid ${C.border}`,
                            cursor: "pointer",
                            background: n.is_read ? "transparent" : `${dot}08`,
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = C.canvas}
                          onMouseLeave={(e) => e.currentTarget.style.background = n.is_read ? "transparent" : `${dot}08`}
                        >
                          <div style={{ width: 9, height: 9, borderRadius: "50%", background: n.is_read ? C.border : dot, marginTop: 5, flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            {n.actor_name && (
                              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: C.ink }}>
                                {n.actor_name}{" "}
                              </span>
                            )}
                            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: C.slate }}>
                              {n.message}
                            </span>
                            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.slateLight, marginTop: 3 }}>
                              {n.time_ago}
                            </div>
                          </div>
                          {!n.is_read && (
                            <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0, marginTop: 6 }} />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div style={{ padding: "9px 16px", textAlign: "center", borderTop: `1px solid ${C.border}` }}>
                    <button
                      onClick={() => { setShowNotifs(false); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: C.slateLight, fontSize: 12, fontFamily: "Inter, sans-serif" }}
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* User */}
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Avatar name={currentUser} size={32} />
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: C.ink }}>{currentUser}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: C.slateLight, textTransform: "capitalize" }}>
              {userRole === "employee" ? "Employee" : userRole || "HR Administrator"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
