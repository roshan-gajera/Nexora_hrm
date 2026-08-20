import React, { createContext, useContext, useState, useCallback } from "react";
import { C } from "../constants/theme";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

const ToastCtx = createContext(null);

const ICONS = {
  success: <CheckCircle size={16} />,
  error:   <XCircle     size={16} />,
  warning: <AlertCircle size={16} />,
  info:    <Info        size={16} />,
};
const COLORS = {
  success: { bg: C.tealSoft,  fg: C.teal  },
  error:   { bg: C.coralSoft, fg: C.coral },
  warning: { bg: C.amberSoft, fg: C.amber },
  info:    { bg: C.blueSoft,  fg: C.blue  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const remove = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 10, zIndex: 999 }}>
        {toasts.map((t) => {
          const col = COLORS[t.type] || COLORS.info;
          return (
            <div key={t.id} className="toast-enter" style={{ display: "flex", alignItems: "center", gap: 10, background: col.bg, color: col.fg, border: `1px solid ${col.fg}22`, borderRadius: 10, padding: "12px 16px", minWidth: 260, maxWidth: 360, boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontFamily: "Inter, sans-serif", fontSize: 13.5, fontWeight: 500 }}>
              {ICONS[t.type]}
              <span style={{ flex: 1 }}>{t.message}</span>
              <X size={14} style={{ cursor: "pointer", opacity: 0.6 }} onClick={() => remove(t.id)} />
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
