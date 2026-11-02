import React, { useState, useEffect } from "react";
import { Plus, MapPin, Briefcase, Users, UserPlus, CheckCircle, Eye, X, Filter } from "lucide-react";
import { C } from "../constants/theme";
import { statusTone } from "../utils/helpers";
import { Card, PageHeader, Button, Avatar, Pill, Modal, Input, Select, EmptyState } from "../components/ui";
import { useToast } from "../context/ToastContext";
import {
  fetchJobs,
  fetchCandidates,
  createJob,
  toggleJobStatus,
  createCandidate,
  moveCandidateStage,
} from "../api/recruitmentApi";
import { fetchDepartments } from "../api/departmentsApi";
import { fetchEmployees } from "../api/employeesApi";
import "../styles/RecruitmentPage.css";

const STAGES = ["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"];
const STAGE_COLORS = {
  Applied: C.slate,
  Screening: C.blue,
  Interview: C.amber,
  Offer: "#6B46A8",
  Hired: C.teal,
  Rejected: C.coral,
};

export default function RecruitmentPage() {
  const toast = useToast();
  const [jobs,             setJobs]             = useState([]);
  const [candidates,       setCandidates]       = useState([]);
  const [departments,      setDepartments]      = useState([]);
  const [hiredCount,        setHiredCount]        = useState(0);
  const [loading,          setLoading]          = useState(true);
  const [showForm,         setShowForm]         = useState(false);
  const [selected,         setSelected]         = useState(null);
  const [selectedStage,    setSelectedStage]    = useState("Applied");
  const [movingStage,      setMovingStage]      = useState(false);
  const [dragOverStage,    setDragOverStage]    = useState(null);

  // Active Job Postings states
  const [jobStatusFilter,  setJobStatusFilter]  = useState("Open"); // "Open", "All", "Closed"
  const [selectedJobId,    setSelectedJobId]    = useState(null);   // Filters pipeline to candidates for this job
  const [viewingJob,       setViewingJob]       = useState(null);   // Job details modal
  const [togglingJobId,    setTogglingJobId]    = useState(null);

  // Job Form states
  const [formTitle,       setFormTitle]       = useState("");
  const [formDept,        setFormDept]        = useState("Engineering");
  const [formLocation,    setFormLocation]    = useState("");
  const [formOpenings,    setFormOpenings]    = useState(1);
  const [formJobType,     setFormJobType]     = useState("Full-time");
  const [formDescription, setFormDescription] = useState("");
  const [submitting,      setSubmitting]      = useState(false);

  // Candidate Form states
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [candName,           setCandName]           = useState("");
  const [candEmail,          setCandEmail]          = useState("");
  const [candJob,            setCandJob]            = useState("");
  const [candStage,          setCandStage]          = useState("Applied");
  const [candSalary,         setCandSalary]         = useState("");
  const [creatingCand,       setCreatingCand]       = useState(false);
  const [candError,          setCandError]          = useState("");

  // Offer phase modal states
  const [offerModalCandidate, setOfferModalCandidate] = useState(null);
  const [offerInputSalary,    setOfferInputSalary]    = useState("");
  const [selectedSalary,      setSelectedSalary]      = useState("");

  // Load jobs, candidates, departments, and employees on mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.allSettled([fetchJobs(), fetchCandidates(), fetchDepartments(), fetchEmployees()])
      .then(([jobRes, candRes, deptRes, empRes]) => {
        if (!isMounted) return;
        if (jobRes.status === "fulfilled") {
          const items = Array.isArray(jobRes.value) ? jobRes.value : jobRes.value?.results || [];
          setJobs(items);
          if (items.length > 0 && !candJob) {
            setCandJob(items[0].title);
          }
        }
        if (candRes.status === "fulfilled") {
          const items = Array.isArray(candRes.value) ? candRes.value : candRes.value?.results || [];
          // Filter out any candidates with stage === 'Hired'
          setCandidates(items.filter((c) => c.stage !== "Hired"));
        }
        if (deptRes.status === "fulfilled") {
          const dList = Array.isArray(deptRes.value) ? deptRes.value : deptRes.value?.results || [];
          const names = dList.map((d) => d.name).filter(Boolean);
          if (names.length > 0) {
            setDepartments(names);
            setFormDept(names[0]);
          }
        }
        if (empRes.status === "fulfilled") {
          const empList = Array.isArray(empRes.value) ? empRes.value : empRes.value?.results || [];
          setHiredCount(empList.length);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function getNextStage(current) {
    const idx = STAGES.indexOf(current);
    if (idx >= 0 && idx < STAGES.length - 1) return STAGES[idx + 1];
    return null;
  }

  function getPrevStage(current) {
    const idx = STAGES.indexOf(current);
    if (idx > 0) return STAGES[idx - 1];
    return null;
  }

  async function handleMoveStage(candidateId, newStage, salary = undefined) {
    if (!candidateId || !newStage) return;
    setMovingStage(true);
    try {
      const res = await moveCandidateStage(candidateId, newStage, salary);
      if (newStage === "Hired" || res?.hired) {
        // Candidate has been hired: transfer to employee and remove from candidate pipeline!
        setCandidates((prev) => prev.filter((c) => String(c.id) !== String(candidateId)));
        setHiredCount((prev) => prev + 1);
        if (selected && String(selected.id) === String(candidateId)) {
          setSelected(null);
        }
        const empCode = res?.employee?.employee_code ? ` (${res.employee.employee_code})` : "";
        const salText = res?.employee?.salary > 0 ? ` with salary ₹${Number(res.employee.salary).toLocaleString()}` : "";
        toast(
          res?.message ||
            `Candidate hired${salText} and added to Employee Directory${empCode}! Removed from pipeline.`
        );
      } else {
        setCandidates((prev) =>
          prev.map((c) =>
            String(c.id) === String(candidateId)
              ? {
                  ...c,
                  stage: newStage,
                  ...(salary !== undefined && salary !== "" ? { salary: parseFloat(salary) || 0 } : {}),
                }
              : c
          )
        );
        if (selected && String(selected.id) === String(candidateId)) {
          setSelected((prev) => ({
            ...prev,
            stage: newStage,
            ...(salary !== undefined && salary !== "" ? { salary: parseFloat(salary) || 0 } : {}),
          }));
          setSelectedStage(newStage);
        }
        toast(`Candidate moved to ${newStage}`);
      }
    } catch (err) {
      toast(err.message || "Failed to update stage", "error");
    } finally {
      setMovingStage(false);
    }
  }

  function initiateMoveStage(candidate, newStage) {
    if (newStage === "Offer") {
      setOfferModalCandidate(candidate);
      setOfferInputSalary(candidate.salary || "");
    } else if (newStage === "Hired") {
      // Transfer candidate to employee with their offered salary
      handleMoveStage(candidate.id, "Hired", candidate.salary || selectedSalary);
    } else {
      handleMoveStage(candidate.id, newStage);
    }
  }

  async function handleToggleJobStatus(jobId, e) {
    if (e) e.stopPropagation();
    setTogglingJobId(jobId);
    try {
      const updated = await toggleJobStatus(jobId);
      setJobs((prev) =>
        prev.map((j) => (String(j.id) === String(jobId) ? { ...j, status: updated.status } : j))
      );
      if (viewingJob && String(viewingJob.id) === String(jobId)) {
        setViewingJob((prev) => ({ ...prev, status: updated.status }));
      }
      toast(`Job status updated to ${updated.status}`);
    } catch (err) {
      toast(err.message || "Failed to update job status", "error");
    } finally {
      setTogglingJobId(null);
    }
  }

  async function handleCreateCandidate(e) {
    if (e) e.preventDefault();
    setCandError("");
    if (!candName.trim()) {
      setCandError("Please enter candidate name");
      toast("Please enter candidate name", "error");
      return;
    }
    if (!candEmail.trim()) {
      setCandError("Please enter candidate email");
      toast("Please enter candidate email", "error");
      return;
    }
    setCreatingCand(true);
    try {
      const payload = {
        name: candName.trim(),
        email: candEmail.trim(),
        job: candJob || (jobs[0]?.title ?? "Full Stack Developer"),
        stage: candStage || "Applied",
        ...(candSalary ? { salary: parseFloat(candSalary) || 0 } : {}),
      };
      const created = await createCandidate(payload);
      if (created?.hired || candStage === "Hired") {
        setHiredCount((prev) => prev + 1);
        const empCode = created?.employee?.employee_code ? ` (${created.employee.employee_code})` : "";
        const salText = created?.employee?.salary > 0 ? ` with salary ₹${Number(created.employee.salary).toLocaleString()}` : "";
        toast(
          created?.message ||
            `Candidate ${created.name || candName} hired${salText} and added to Employee Directory${empCode}!`,
          "success"
        );
      } else {
        setCandidates((prev) => [created, ...prev]);
        toast(`Candidate ${created.name || candName} added to pipeline!`);
      }
      setShowCandidateModal(false);
      setCandName("");
      setCandEmail("");
      setCandSalary("");
      setCandStage("Applied");
    } catch (err) {
      setCandError(err.message || "Failed to add candidate");
      toast(err.message || "Failed to add candidate", "error");
    } finally {
      setCreatingCand(false);
    }
  }

  async function handlePostJob(e) {
    if (e) e.preventDefault();
    if (!formTitle.trim()) {
      toast("Please enter a job title", "error");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: formTitle.trim(),
        department: formDept,
        location: formLocation.trim() || "Remote",
        openings: parseInt(formOpenings, 10) || 1,
        job_type: formJobType,
        description: formDescription.trim(),
      };
      const newJob = await createJob(payload);
      toast(`Job "${newJob.title || formTitle}" posted! Sent message & notification to every employee.`);
      setShowForm(false);
      setFormTitle("");
      setFormLocation("");
      setFormOpenings(1);
      setFormDescription("");

      // Update state with new job and refresh list
      setJobs((prev) => [newJob, ...prev.filter((j) => String(j.id) !== String(newJob.id))]);
      const refreshed = await fetchJobs();
      const items = Array.isArray(refreshed) ? refreshed : refreshed?.results || [];
      if (items.length > 0) setJobs(items);
    } catch (err) {
      toast(err.message || "Failed to post job", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // Summary counts
  const openJobs   = jobs.filter((j) => j.status === "Open").length;
  const closedJobs = jobs.filter((j) => j.status === "Closed").length;
  const totalApplicants = candidates.length || jobs.reduce((s, j) => s + (j.applicants || 0), 0);

  // Active / Filtered jobs
  const displayedJobs = jobs.filter((j) => {
    if (jobStatusFilter === "All") return true;
    return j.status === jobStatusFilter;
  });

  // Selected job for candidate filtering
  const selectedJobObj = jobs.find((j) => String(j.id) === String(selectedJobId));

  // Filtered candidates in pipeline
  const displayedCandidates = selectedJobId
    ? candidates.filter((c) => {
        return (
          String(c.jobId) === String(selectedJobId) ||
          (selectedJobObj &&
            (c.jobTitle === selectedJobObj.title || c.job_title === selectedJobObj.title))
        );
      })
    : candidates;

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.slate, fontFamily: "Inter, sans-serif" }}>
        Loading recruitment data...
      </div>
    );
  }

  return (
    <div className="page-enter">
      <PageHeader title="Recruitment" subtitle="Open roles, job postings, and candidate pipeline" action={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

            <Button variant="outline" icon={UserPlus} onClick={() => { if (selectedJobObj) setCandJob(selectedJobObj.title); setShowCandidateModal(true); }}>
              Add Candidate
            </Button>

            <Button icon={Plus} onClick={() => setShowForm(true)}>
              Post a Job
            </Button>
          </div>
        }
      />

      {/* Summary */}
      <div className="recruitment-summary-grid">
        {[
          { label: "Open Positions", value: openJobs, color: C.teal },
          { label: "Total Applicants", value: totalApplicants, color: C.blue },
          { label: "In Interview", value: candidates.filter((c) => c.stage === "Interview").length, color: C.amber },
          { label: "Hired This Cycle", value: hiredCount, color: "#6B46A8" },
        ].map((s) => (
          <Card key={s.label} accent={s.color}>
            <div className="recruitment-metric-label">{s.label}</div>
            <div className="recruitment-metric-val">{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Job Postings Section Header & Filter */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div>
          <span className="recruitment-section-title" style={{ margin: 0, fontSize: 16 }}>
            Job Postings
          </span>
          <span style={{ marginLeft: 8, fontSize: 12.5, color: C.slateLight, fontFamily: "Inter, sans-serif" }}>
            Click a card to filter the candidate pipeline below
          </span>
        </div>
        <div className="recruitment-filter-tabs">

          <button type="button" className={`recruitment-filter-btn ${jobStatusFilter === "All" ? "active" : ""}`} onClick={() => setJobStatusFilter("All")}>
            All Roles ({jobs.length})
          </button>

          <button type="button" className={`recruitment-filter-btn ${jobStatusFilter === "Open" ? "active" : ""}`} onClick={() => setJobStatusFilter("Open")}>
            Active / Open ({openJobs})
          </button>

          <button type="button" className={`recruitment-filter-btn ${jobStatusFilter === "Closed" ? "active" : ""}`} onClick={() => setJobStatusFilter("Closed")}>
            Closed ({closedJobs})
          </button>

        </div>
      </div>

      {/* Job cards grid */}
      {displayedJobs.length === 0 ? (
        <Card style={{ marginBottom: 28 }}>
          <EmptyState text={`No ${jobStatusFilter === "All" ? "" : jobStatusFilter.toLowerCase()} job postings found.`} />
          <div style={{ textAlign: "center", marginTop: -20, paddingBottom: 20 }}>
            <Button icon={Plus} onClick={() => setShowForm(true)} small>
              Post a New Job
            </Button>
          </div>
        </Card>
      ) : (
        <div className="recruitment-jobs-grid">
          {displayedJobs.map((j) => {
            const isSelected = String(j.id) === String(selectedJobId);
            const deptText = j.department || j.department_name || "General";
            const hiredForJob = candidates.filter(
              (c) =>
                (String(c.jobId) === String(j.id) || c.jobTitle === j.title || c.job_title === j.title) && c.stage === "Hired" ).length;
            const pct = j.openings > 0 ? Math.min(100, Math.round((hiredForJob / j.openings) * 100)) : 0;

            return (
              <div key={j.id} className={`recruitment-job-card ${isSelected ? "is-selected" : ""}`} onClick={() => setSelectedJobId(isSelected ? null : j.id)} title="Click to filter candidates for this position">

                <Card accent={isSelected ? C.teal : j.status === "Open" ? C.teal : C.slateLight} style={{height: "100%",display: "flex",flexDirection: "column",justifyContent: "space-between",background: isSelected ? "rgba(31, 138, 112, 0.04)" : "#fff",}}>
                  <div>
                    <div className="recruitment-job-header">
                      <span className="recruitment-job-title">{j.title}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Pill tone={statusTone(j.status)}>{j.status}</Pill>
                        {isSelected && (
                          <span style={{fontSize: 11, fontWeight: 700, background: C.teal, color: "#fff", padding: "2px 6px", borderRadius: 4, }}>
                            Selected
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="recruitment-job-meta">
                      <span className="recruitment-job-meta-item">
                        <Briefcase size={12} />
                        {deptText}
                      </span>
                      <span className="recruitment-job-meta-item">
                        <MapPin size={12} />
                        {j.location || "Remote"}
                      </span>
                      <span className="recruitment-job-meta-item">
                        <Users size={12} />
                        {j.openings} opening{j.openings > 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="recruitment-job-stats-row">
                      <span>{j.applicants || 0} applicants</span>
                      <span>
                        {hiredForJob}/{j.openings} filled ({pct}%)
                      </span>
                    </div>

                    <div className="recruitment-progress-track">
                      <div className="recruitment-progress-fill" style={{ width: `${pct}%`, background: j.status === "Open" ? C.teal : C.slateLight,}}/>
                    </div>
                  </div>

                  {/* Card quick action footer */}
                  <div style={{display: "flex",justifyContent: "space-between",alignItems: "center",marginTop: 14,paddingTop: 10,borderTop: `1px solid ${C.border}`,}}onClick={(e) => e.stopPropagation()}>
                    
                    <button type="button" onClick={() => setViewingJob(j)} 
                      style={{background: "none",border: "none",cursor: "pointer",color: C.slate,fontSize: 12,fontWeight: 600,display: "inline-flex",alignItems: "center",gap: 4,padding: 0,}}>
                      <Eye size={13} /> Details
                    </button>

                    <button
                      type="button"
                      disabled={togglingJobId === j.id}
                      onClick={(e) => handleToggleJobStatus(j.id, e)}
                      style={{background: "none",border: `1px solid ${j.status === "Open" ? C.coralSoft : C.tealSoft}`,borderRadius: 6,cursor: togglingJobId === j.id ? "not-allowed" : "pointer",color: j.status === "Open" ? C.coral : C.teal,fontSize: 11.5,fontWeight: 600,padding: "3px 8px",}}>
                      {togglingJobId === j.id? "Updating...": j.status === "Open"? "Close Role": "Reopen Role"}
                    </button>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Candidate pipeline header & active filter banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p className="recruitment-section-title" style={{ margin: 0 }}>
          Candidate Pipeline
        </p>
        <span style={{ fontSize: 12, color: C.slateLight, fontFamily: "Inter, sans-serif" }}>
          Tip: Drag & drop candidates between stages or use arrow buttons
        </span>
      </div>

      {selectedJobObj && (
        <div className="recruitment-pipeline-filter-banner">
          <span>
            Filtering pipeline for <strong>{selectedJobObj.title}</strong> ({displayedCandidates.length} candidate{displayedCandidates.length === 1 ? "" : "s"})
          </span>
          <button
            type="button"
            onClick={() => setSelectedJobId(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.teal,
              fontWeight: 700,
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <X size={14} /> Clear filter (Show All)
          </button>
        </div>
      )}

      {/* Kanban Pipeline Board */}
      <div className="recruitment-kanban-board">
        {STAGES.map((stage) => {
          const stageCandidates = displayedCandidates.filter((c) => c.stage === stage);
          const isDragTarget = dragOverStage === stage;
          return (
            <div
              key={stage}
              className={`recruitment-kanban-column ${isDragTarget ? "drag-over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStage(stage);
              }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverStage(null);
                const id = e.dataTransfer.getData("candidateId");
                if (id) {
                  const cand = candidates.find((c) => String(c.id) === String(id));
                  if (cand) initiateMoveStage(cand, stage);
                  else handleMoveStage(id, stage);
                }
              }}
            >
              <div className="recruitment-kanban-header">
                <span className="recruitment-kanban-stage-name" style={{ color: STAGE_COLORS[stage] }}>
                  {stage}
                </span>
                <span className="recruitment-kanban-stage-count">{stageCandidates.length}</span>
              </div>
              <div className="recruitment-kanban-cards">
                {stage === "Hired" && stageCandidates.length === 0 && (
                  <div
                    style={{
                      padding: "16px 10px",
                      textAlign: "center",
                      color: C.teal,
                      fontSize: 12,
                      fontWeight: 600,
                      border: "1.5px dashed rgba(31, 138, 112, 0.4)",
                      borderRadius: 8,
                      background: "rgba(31, 138, 112, 0.04)",
                    }}
                  >
                    Candidate in this phase directly goes into employee list
                  </div>
                )}
                {stageCandidates.map((c) => {
                  const roleName = c.jobTitle || c.job_title || "Applicant";
                  const dateStr = c.appliedDate || c.applied_date || "Recent";
                  const nextStage = getNextStage(c.stage);
                  const prevStage = getPrevStage(c.stage);
                  return (
                    <div
                      key={c.id}
                      className="recruitment-candidate-card"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("candidateId", String(c.id))}
                      onClick={() => {
                        setSelected(c);
                        setSelectedStage(c.stage);
                        setSelectedSalary(c.salary || "");
                      }}
                    >
                      <Card style={{ padding: 12, borderLeft: `3px solid ${STAGE_COLORS[stage]}` }}>
                        <div className="recruitment-candidate-top">
                          <Avatar name={c.name} size={26} />
                          <span className="recruitment-candidate-name">{c.name}</span>
                        </div>
                        <div className="recruitment-candidate-role">{roleName}</div>

                        {c.salary > 0 && (
                          <div style={{ marginTop: 4 }}>
                            <span
                              style={{
                                display: "inline-block",
                                background: "rgba(107, 70, 168, 0.1)",
                                color: "#6B46A8",
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: 4,
                              }}
                            >
                              Offer: ₹{Number(c.salary).toLocaleString()}
                            </span>
                          </div>
                        )}

                        <div className="recruitment-candidate-date" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span>{dateStr}</span>
                          <div style={{ display: "flex", gap: 3 }} onClick={(e) => e.stopPropagation()}>
                            {prevStage && (
                              <button
                                type="button"
                                title={`Move to ${prevStage}`}
                                onClick={() => handleMoveStage(c.id, prevStage, c.salary)}
                                style={{
                                  background: "none",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: 4,
                                  cursor: "pointer",
                                  fontSize: 10,
                                  padding: "1px 5px",
                                  color: C.slate,
                                }}
                              >
                                ←
                              </button>
                            )}
                            {nextStage && (
                              <button
                                type="button"
                                title={
                                  nextStage === "Hired"
                                    ? "Hire & transfer to Employee Directory"
                                    : nextStage === "Offer"
                                    ? "Make Job Offer"
                                    : `Advance to ${nextStage}`
                                }
                                onClick={() => initiateMoveStage(c, nextStage)}
                                style={{
                                  background: nextStage === "Hired" ? C.tealSoft : nextStage === "Offer" ? "rgba(107, 70, 168, 0.1)" : "none",
                                  border: `1px solid ${nextStage === "Hired" ? C.teal : nextStage === "Offer" ? "#6B46A8" : "#e2e8f0"}`,
                                  borderRadius: 4,
                                  cursor: "pointer",
                                  fontSize: 10,
                                  padding: "1px 5px",
                                  color: nextStage === "Offer" ? "#6B46A8" : C.teal,
                                  fontWeight: 700,
                                }}
                              >
                                {nextStage === "Hired" ? "Hire ✓" : nextStage === "Offer" ? "Offer ₹" : "→"}
                              </button>
                            )}
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Candidate detail modal */}
      {selected && (
        <Modal title="Candidate Details" onClose={() => setSelected(null)} width={460}>
          <div className="recruitment-candidate-modal-header">
            <Avatar name={selected.name} size={52} />
            <div>
              <div className="recruitment-candidate-modal-name">{selected.name}</div>
              <div className="recruitment-candidate-modal-role">
                {selected.jobTitle || selected.job_title || "Applicant"}
              </div>
              <div className="recruitment-candidate-modal-pill">
                <Pill tone={statusTone(selected.stage)}>{selected.stage}</Pill>
              </div>
            </div>
          </div>
          {[
            ["Email", selected.email || "—"],
            ["Role", selected.jobTitle || selected.job_title || "—"],
            ["Applied Date", selected.appliedDate || selected.applied_date || "—"],
            ["Current Stage", selected.stage],
          ].map(([k, v]) => (
            <div key={k} className="recruitment-candidate-modal-row">
              <span className="recruitment-candidate-modal-label">{k}</span>
              <span className="recruitment-candidate-modal-val">{v}</span>
            </div>
          ))}

          {/* Salary in Candidate Details Modal */}
          <div style={{ marginTop: 14 }}>
            <Input
              label="Offered / Negotiated Salary (₹)"
              type="number"
              placeholder="e.g. 85000"
              value={selectedSalary}
              onChange={(e) => setSelectedSalary(e.target.value)}
            />
            {Number(selectedSalary) > 0 && (
              <span
                style={{
                  fontSize: 11.5,
                  color: C.teal,
                  fontWeight: 600,
                  display: "block",
                  marginTop: -8,
                  marginBottom: 8,
                }}
              >
                ✓ Saved as official starting salary when moved to Hired.
              </span>
            )}
          </div>

          {/* Change Stage Section */}
          <div style={{ marginTop: 8 }}>
            <Select
              label="Change Pipeline Stage"
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              options={STAGES}
            />
          </div>

          <div className="recruitment-candidate-modal-actions" style={{ marginTop: 16 }}>
            <Button
              variant="teal"
              disabled={movingStage}
              onClick={() => handleMoveStage(selected.id, selectedStage, selectedSalary)}
            >
              {selectedStage === "Hired"
                ? "Hire & Add to Employees ✓"
                : selectedStage === "Offer"
                ? "Update Offer & Salary"
                : movingStage
                ? "Updating..."
                : "Update Stage & Details"}
            </Button>

            {getNextStage(selected.stage) && (
              <Button
                variant={getNextStage(selected.stage) === "Hired" ? "teal" : "primary"}
                disabled={movingStage}
                onClick={() =>
                  initiateMoveStage(
                    { ...selected, salary: selectedSalary || selected.salary },
                    getNextStage(selected.stage)
                  )
                }
              >
                {getNextStage(selected.stage) === "Hired"
                  ? "Hire & Add to Employees →"
                  : getNextStage(selected.stage) === "Offer"
                  ? "Make Job Offer →"
                  : `Advance to ${getNextStage(selected.stage)} →`}
              </Button>
            )}

            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}

      {/* Job Details Modal */}
      {viewingJob && (
        <Modal title={`Job Details: ${viewingJob.title}`} onClose={() => setViewingJob(null)} width={500}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
            <div>
              <h3 style={{ margin: 0, fontFamily: "Sora, sans-serif", fontSize: 18, color: C.ink }}>
                {viewingJob.title}
              </h3>
              <p style={{ margin: "4px 0 0", color: C.slate, fontSize: 13 }}>
                {viewingJob.department || viewingJob.department_name || "General"} • {viewingJob.location || "Remote"}
              </p>
            </div>
            <Pill tone={statusTone(viewingJob.status)}>{viewingJob.status}</Pill>
          </div>

          {[
            ["Job Type", viewingJob.job_type || viewingJob.type || "Full-time"],
            ["Openings", viewingJob.openings],
            ["Total Applicants", viewingJob.applicants || 0],
            ["Status", viewingJob.status],
            ["Description", viewingJob.description || "No description provided."],
          ].map(([k, v]) => (
            <div key={k} className="recruitment-candidate-modal-row">
              <span className="recruitment-candidate-modal-label">{k}</span>
              <span className="recruitment-candidate-modal-val" style={{ maxWidth: "65%", textAlign: "right" }}>
                {v}
              </span>
            </div>
          ))}

          <div className="recruitment-candidate-modal-actions" style={{ marginTop: 20 }}>
            <Button
              variant="teal"
              onClick={() => {
                setSelectedJobId(viewingJob.id);
                setViewingJob(null);
                toast(`Pipeline filtered for ${viewingJob.title}`);
              }}
            >
              <Filter size={14} /> Filter Pipeline
            </Button>

            <Button
              variant={viewingJob.status === "Open" ? "danger" : "outline"}
              disabled={togglingJobId === viewingJob.id}
              onClick={() => handleToggleJobStatus(viewingJob.id)}
            >
              {togglingJobId === viewingJob.id
                ? "Updating..."
                : viewingJob.status === "Open"
                ? "Close This Role"
                : "Reopen Role"}
            </Button>

            <Button variant="outline" onClick={() => setViewingJob(null)}>
              Close
            </Button>
          </div>
        </Modal>
      )}

      {/* Add Candidate Modal */}
      {showCandidateModal && (
        <Modal title="Add Candidate to Pipeline" onClose={() => setShowCandidateModal(false)} width={460}>
          <form onSubmit={handleCreateCandidate}>
            {candError && (
              <div
                style={{
                  background: C.coralSoft,
                  color: C.coral,
                  padding: "8px 12px",
                  borderRadius: 6,
                  fontSize: 12.5,
                  marginBottom: 14,
                  fontWeight: 600,
                }}
              >
                {candError}
              </div>
            )}
            <Input
              label="Full Name"
              placeholder="e.g. Priya Sharma"
              value={candName}
              onChange={(e) => setCandName(e.target.value)}
              required
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="priya.sharma@gmail.com"
              value={candEmail}
              onChange={(e) => setCandEmail(e.target.value)}
              required
            />
            <Select
              label="Job Position"
              value={candJob}
              onChange={(e) => setCandJob(e.target.value)}
              options={
                jobs.length > 0
                  ? jobs
                  .filter((j) => j.status === "Open")
                  .map((j) => j.title)
                  : ["Senior Frontend Engineer", "HR Business Partner", "Sales Development Rep"]
              }
            />
            <Select
              label="Initial Stage"
              value={candStage}
              onChange={(e) => setCandStage(e.target.value)}
              options={STAGES}
            />
            <Input
              label="Offered / Expected Salary (₹, optional)"
              type="number"
              placeholder="e.g. 85000"
              value={candSalary}
              onChange={(e) => setCandSalary(e.target.value)}
            />
            <div className="recruitment-form-actions" style={{ marginTop: 18 }}>
              <Button type="button" variant="outline" onClick={() => setShowCandidateModal(false)} disabled={creatingCand}>
                Cancel
              </Button>
              <Button type="submit" variant="teal" disabled={creatingCand}>
                {creatingCand ? "Adding..." : "Add Candidate"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Make Job Offer Modal */}
      {offerModalCandidate && (
        <Modal
          title={`Make Job Offer: ${offerModalCandidate.name}`}
          onClose={() => setOfferModalCandidate(null)}
          width={450}
        >
          <div style={{ marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
            <p style={{ margin: "0 0 4px", fontSize: 14.5, fontWeight: 700, color: C.ink }}>
              {offerModalCandidate.name}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: C.slate }}>
              Position: <strong>{offerModalCandidate.jobTitle || offerModalCandidate.job_title || "Applicant"}</strong>
            </p>
          </div>

          <p style={{ fontSize: 13, color: C.slate, marginBottom: 14, lineHeight: 1.5 }}>
            Specify the starting salary offer for this candidate. When they accept and move to <strong>Hired</strong>, this salary will automatically be recorded in the Employee table.
          </p>

          <Input
            label="Offered Annual / Monthly Salary (₹)"
            type="number"
            placeholder="e.g. 85000"
            value={offerInputSalary}
            onChange={(e) => setOfferInputSalary(e.target.value)}
            required
          />

          <div className="recruitment-form-actions" style={{ marginTop: 20 }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOfferModalCandidate(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="teal"
              disabled={movingStage}
              onClick={() => {
                handleMoveStage(offerModalCandidate.id, "Offer", offerInputSalary);
                setOfferModalCandidate(null);
              }}
            >
              Confirm Offer {offerInputSalary ? `(₹${Number(offerInputSalary).toLocaleString()})` : ""}
            </Button>
          </div>
        </Modal>
      )}

      {/* Post Job Modal */}
      {showForm && (
        <Modal title="Post a New Job" onClose={() => setShowForm(false)} width={480}>
          <form onSubmit={handlePostJob}>
            <Input
              label="Job title"
              placeholder="e.g. Senior React Developer"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              required
            />
            <Select
              label="Department"
              value={formDept}
              onChange={(e) => setFormDept(e.target.value)}
              options={
                departments.length > 0
                  ? departments
                  : ["Engineering", "Sales", "Marketing", "Human Resources", "Finance", "Support"]
              }
            />
            <div className="recruitment-form-row">
              <Input
                label="Location"
                placeholder="City or Remote"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
              />
              <Input
                label="Openings"
                type="number"
                min="1"
                value={formOpenings}
                onChange={(e) => setFormOpenings(e.target.value)}
              />
            </div>
            <Select
              label="Job type"
              value={formJobType}
              onChange={(e) => setFormJobType(e.target.value)}
              options={["Full-time", "Part-time", "Contract", "Internship"]}
            />
            <Input
              label="Description (optional)"
              placeholder="Responsibilities, requirements, skills..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
            <div className="recruitment-form-actions">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Posting..." : "Post Job & Notify Employees"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
