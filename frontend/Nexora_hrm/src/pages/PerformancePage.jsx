import React, { useState } from "react";
import { Star, Check, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { C } from "../constants/theme";
import { statusTone } from "../utils/helpers";
import { Card, PageHeader, StatCard, Table, Modal, Avatar, Pill, Button } from "../components/ui";

function Stars({ rating, size = 14 }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} fill={i <= rating ? C.amber : "none"} color={i <= rating ? C.amber : C.border} />
      ))}
    </div>
  );
}

export default function PerformancePage({ reviews }) {
  const [viewing, setViewing] = useState(null);

  const avg       = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
  const completed = reviews.filter((r) => r.status === "Completed").length;

  const ratingDist = [1, 2, 3, 4, 5].map((r) => ({
    label: `${r} Star${r > 1 ? "s" : ""}`,
    count: reviews.filter((rv) => rv.rating === r).length,
  }));

  return (
    <div className="page-enter">
      <PageHeader title="Performance" subtitle="H1 2026 review cycle" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 16, marginBottom: 20 }}>
        <StatCard label="Average Rating"    value={`${avg} / 5`}                   delta="Across all reviews" positive icon={Star}       accent={C.amber} />
        <StatCard label="Reviews Completed" value={`${completed}/${reviews.length}`} delta="This cycle"       positive icon={Check}      accent={C.teal}  />
        <StatCard label="Top Performers"    value={reviews.filter((r) => r.rating === 5).length} delta="Rating 5/5" positive icon={TrendingUp} accent={C.blue} />
      </div>

      {/* Rating distribution */}
      <Card style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, color: C.ink, margin: "0 0 14px" }}>Rating distribution</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={ratingDist} barSize={40}>
            <CartesianGrid stroke={C.border} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12, fontFamily: "Inter" }} stroke="transparent" />
            <YAxis tick={{ fontSize: 12, fontFamily: "Inter" }} stroke="transparent" allowDecimals={false} />
            <Tooltip contentStyle={{ fontFamily: "Inter", fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {ratingDist.map((_, i) => <Cell key={i} fill={[C.coral, C.amber, C.blue, C.teal, "#6B46A8"][i]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card style={{ padding: 0 }}>
        <Table
          columns={["Employee", "Department", "Period", "Reviewer", "Rating", "Status", ""]}
          rows={reviews}
          renderRow={(r) => (
            <tr key={r.id} className="hoverable" style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: "11px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={r.name} size={28} />{r.name}</div>
              </td>
              <td style={{ padding: "11px 14px", color: C.slate, fontSize: 13 }}>{r.department}</td>
              <td style={{ padding: "11px 14px", color: C.slate, fontSize: 13 }}>{r.period}</td>
              <td style={{ padding: "11px 14px", color: C.slate, fontSize: 13 }}>{r.reviewer}</td>
              <td style={{ padding: "11px 14px" }}><Stars rating={r.rating} /></td>
              <td style={{ padding: "11px 14px" }}><Pill tone={statusTone(r.status)}>{r.status}</Pill></td>
              <td style={{ padding: "11px 14px" }}>
                <Button small variant="ghost" onClick={() => setViewing(r)}>View</Button>
              </td>
            </tr>
          )}
        />
      </Card>

      {viewing && (
        <Modal title="Performance Review" onClose={() => setViewing(null)} width={480}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
            <Avatar name={viewing.name} size={52} />
            <div>
              <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 17, color: C.ink }}>{viewing.name}</div>
              <div style={{ color: C.slate, fontSize: 13 }}>{viewing.department} · {viewing.period}</div>
              <div style={{ marginTop: 8 }}><Stars rating={viewing.rating} size={16} /></div>
            </div>
          </div>
          {[
            { label: "Reviewer",  value: viewing.reviewer },
            { label: "Status",    value: <Pill tone={statusTone(viewing.status)}>{viewing.status}</Pill> },
            { label: "Rating",    value: `${viewing.rating} / 5` },
          ].map((f) => (
            <div key={f.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}`, fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
              <span style={{ color: C.slateLight, fontWeight: 600 }}>{f.label}</span>
              <span style={{ color: C.ink }}>{f.value}</span>
            </div>
          ))}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: C.slateLight, marginBottom: 6 }}>COMMENTS</div>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13.5, color: C.slate, lineHeight: 1.6 }}>{viewing.comments}</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
