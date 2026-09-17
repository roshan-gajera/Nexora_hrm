import React, { useState, useEffect } from "react";
import { Plus, MapPin, Briefcase, Users } from "lucide-react";
import { C } from "../constants/theme";
import { statusTone } from "../utils/helpers";
import { Card, PageHeader, Button, Avatar, Pill, Modal, Input, Select } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { fetchJobs, fetchCandidates } from "../api/recruitmentApi";

const STAGES = ["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"];
const STAGE_COLORS = { Applied: C.slate, Screening: C.blue, Interview: C.amber, Offer: "#6B46A8", Hired: C.teal, Rejected: C.coral };

export default function RecruitmentPage() {
  const toast = useToast();
  const [jobs,       setJobs]       = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [selected,   setSelected]   = useState(null);

  // Load jobs and candidates on mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.allSettled([fetchJobs(), fetchCandidates()])
      .then(([jobRes, candRes]) => {
        if (!isMounted) return;
        if (jobRes.status === "fulfilled") {
          const items = Array.isArray(jobRes.value) ? jobRes.value : jobRes.value?.results || [];
          setJobs(items);
        }
        if (candRes.status === "fulfilled") {
          const items = Array.isArray(candRes.value) ? candRes.value : candRes.value?.results || [];
          setCandidates(items);
        }
      })
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, []);

  const totalApplicants = jobs.reduce((s, j) => s + j.applicants, 0);
  const openJobs        = jobs.filter((j) => j.status === "Open").length;
  const hiredCount      = candidates.filter((c) => c.stage === "Hired").length;

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.slate, fontFamily: "Inter, sans-serif" }}>
        Loading recruitment data...
      </div>
    );
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="Recruitment"
        subtitle="Open roles and candidate pipeline"
        action={<Button icon={Plus} onClick={() => setShowForm(true)}>Post a job</Button>}
      />

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Open Positions",    value: openJobs,        color: C.teal    },
          { label: "Total Applicants",  value: totalApplicants, color: C.blue    },
          { label: "In Interview",      value: candidates.filter((c) => c.stage === "Interview").length, color: C.amber },
          { label: "Hired This Cycle",  value: hiredCount,      color: "#6B46A8" },
        ].map((s) => (
          <Card key={s.label} accent={s.color}>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: C.slate, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, color: C.ink }}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Job cards */}
      <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, color: C.ink, marginBottom: 12 }}>Active job postings</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px,1fr))", gap: 14, marginBottom: 28 }}>
        {jobs.map((j) => {
          const pct = Math.min(100, Math.round((j.applicants / (j.openings * 15)) * 100));
          return (
            <Card key={j.id} accent={j.status === "Open" ? C.teal : C.slateLight} style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, color: C.ink, fontSize: 14.5, lineHeight: 1.3 }}>{j.title}</span>
                <Pill tone={statusTone(j.status)}>{j.status}</Pill>
              </div>
              <div style={{ display: "flex", gap: 12, color: C.slate, fontSize: 12.5, marginBottom: 12, flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Briefcase size={12} />{j.department}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} />{j.location}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Users size={12} />{j.openings} opening{j.openings > 1 ? "s" : ""}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.slateLight, marginBottom: 6 }}>
                <span>{j.applicants} applicants</span>
                <span>{pct}% filled</span>
              </div>
              <div style={{ height: 4, borderRadius: 99, background: C.canvas, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: j.status === "Open" ? C.teal : C.slateLight, borderRadius: 99 }} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Kanban pipeline */}
      <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, color: C.ink, marginBottom: 12 }}>Candidate pipeline</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(155px,1fr))", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
        {STAGES.map((stage) => {
          const stageCandidates = candidates.filter((c) => c.stage === stage);
          return (
            <div key={stage}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, fontWeight: 700, color: STAGE_COLORS[stage], textTransform: "uppercase", letterSpacing: 0.5 }}>{stage}</span>
                <span style={{ fontFamily: "Sora, sans-serif", fontSize: 13, fontWeight: 700, color: C.ink }}>{stageCandidates.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stageCandidates.map((c) => (
                  <Card key={c.id} style={{ padding: 12, cursor: "pointer", borderLeft: `3px solid ${STAGE_COLORS[stage]}` }} onClick={() => setSelected(c)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                      <Avatar name={c.name} size={26} />
                      <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12.5, color: C.ink, lineHeight: 1.2 }}>{c.name}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.slateLight, fontFamily: "Inter, sans-serif" }}>{c.jobTitle}</div>
                    <div style={{ fontSize: 10.5, color: C.slateLight, marginTop: 4 }}>{c.appliedDate}</div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Candidate detail modal */}
      {selected && (
        <Modal title="Candidate details" onClose={() => setSelected(null)} width={420}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
            <Avatar name={selected.name} size={52} />
            <div>
              <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 17, color: C.ink }}>{selected.name}</div>
              <div style={{ color: C.slate, fontSize: 13 }}>{selected.jobTitle}</div>
              <div style={{ marginTop: 6 }}><Pill tone={statusTone(selected.stage)}>{selected.stage}</Pill></div>
            </div>
          </div>
          {[["Email", selected.email], ["Applied", selected.appliedDate], ["Stage", selected.stage]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.border}`, fontFamily: "Inter, sans-serif", fontSize: 13.5 }}>
              <span style={{ color: C.slateLight, fontWeight: 600 }}>{k}</span>
              <span style={{ color: C.ink }}>{v}</span>
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <Button variant="teal" onClick={() => { toast(`${selected.name} moved to Interview`); setSelected(null); }}>Schedule Interview</Button>
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
          </div>
        </Modal>
      )}

      {/* Post job modal */}
      {showForm && (
        <Modal title="Post a new job" onClose={() => setShowForm(false)} width={480}>
          <Input label="Job title" placeholder="e.g. Senior React Developer" />
          <Select label="Department" options={["Engineering", "Sales", "Marketing", "Human Resources", "Finance", "Support"]} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Input label="Location" placeholder="City or Remote" />
            <Input label="Openings" type="number" defaultValue={1} />
          </div>
          <Select label="Job type" options={["Full-time", "Part-time", "Contract", "Intern"]} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => { toast("Job posted successfully"); setShowForm(false); }}>Post job</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
