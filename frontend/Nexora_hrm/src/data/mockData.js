import { C } from "../constants/theme";

export const DEPARTMENTS = [
  { id: "d1", name: "Engineering",     head: "Ravi Malhotra", color: C.blue },
  { id: "d2", name: "Sales",           head: "Anita Desai",   color: C.teal },
  { id: "d3", name: "Marketing",       head: "Karan Shah",    color: C.amber },
  { id: "d4", name: "Human Resources", head: "Priya Nair",    color: C.coral },
  { id: "d5", name: "Finance",         head: "Vikram Rao",    color: "#6B46A8" },
  { id: "d6", name: "Support",         head: "Meera Iyer",    color: "#1471A8" },
];

const FIRST    = ["Aarav","Vivaan","Aditya","Ishaan","Kabir","Rohan","Neha","Priya","Ananya","Diya","Sara","Meera","Karan","Rahul","Sanya","Tara","Arjun","Nikhil","Pooja","Riya"];
const LAST     = ["Sharma","Verma","Gupta","Iyer","Nair","Rao","Malhotra","Shah","Desai","Kapoor","Menon","Bhat","Chatterjee","Reddy","Joshi"];
const ROLES    = ["Software Engineer","Product Manager","Sales Executive","Marketing Analyst","HR Specialist","Financial Analyst","Support Lead","UI/UX Designer","QA Engineer","Business Analyst"];
const STATUSES = ["Active","Active","Active","On Leave","Active","Inactive"];

export function genEmployees(n) {
  return Array.from({ length: n }, (_, i) => {
    const first = FIRST[i % FIRST.length];
    const last  = LAST[(i * 3 + 1) % LAST.length];
    const dept  = DEPARTMENTS[i % DEPARTMENTS.length];
    return {
      id:         "E" + (1000 + i),
      name:       `${first} ${last}`,
      email:      `${first.toLowerCase()}.${last.toLowerCase()}@nexorahrm.com`,
      phone:      `+91 9${(800000000 + i * 137).toString().slice(0, 9)}`,
      role:       ROLES[i % ROLES.length],
      department: dept.name,
      manager:    DEPARTMENTS[(i + 2) % DEPARTMENTS.length].head,
      status:     STATUSES[i % STATUSES.length],
      joinDate:   `202${1 + (i % 5)}-0${1 + (i % 9) % 9}-1${i % 9}`,
      salary:     45000 + (i % 12) * 6500,
      location:   ["Ahmedabad","Bengaluru","Pune","Remote","Mumbai"][i % 5],
    };
  });
}

export function genLeaves(emps) {
  const types    = ["Sick Leave","Casual Leave","Earned Leave","Unpaid Leave"];
  const statuses = ["Pending","Approved","Approved","Rejected"];
  return emps.slice(0, 14).map((e, i) => ({
    id:         "L" + (200 + i),
    employeeId: e.id,
    name:       e.name,
    type:       types[i % types.length],
    from:       `2026-07-${(10 + (i % 15)).toString().padStart(2, "0")}`,
    to:         `2026-07-${(12 + (i % 15)).toString().padStart(2, "0")}`,
    days:       1 + (i % 4),
    status:     statuses[i % statuses.length],
    reason:     ["Fever and rest","Family function","Personal work","Travel"][i % 4],
  }));
}

export function genAttendance(emps) {
  const statuses = ["Present","Present","Present","Late","WFH","Absent"];
  return emps.map((e, i) => ({
    employeeId: e.id,
    name:       e.name,
    department: e.department,
    checkIn:    statuses[i % statuses.length] === "Absent" ? "--" : `0${8 + (i % 2)}:${(i * 7) % 60 < 10 ? "0" : ""}${(i * 7) % 60} AM`,
    checkOut:   statuses[i % statuses.length] === "Absent" ? "--" : `0${5 + (i % 2)}:${(i * 11) % 60 < 10 ? "0" : ""}${(i * 11) % 60} PM`,
    status:     statuses[i % statuses.length],
  }));
}

export function genPayroll(emps) {
  return emps.map((e, i) => {
    const basic       = Math.round(e.salary * 0.6);
    const allowances  = Math.round(e.salary * 0.3);
    const deductions  = Math.round(e.salary * 0.08);
    return {
      id:          "P" + (300 + i),
      employeeId:  e.id,
      name:        e.name,
      department:  e.department,
      month:       "June 2026",
      basic, allowances, deductions,
      net:         basic + allowances - deductions,
      status:      i % 5 === 0 ? "Pending" : "Paid",
    };
  });
}

export const JOBS_SEED = [
  { id: "J1", title: "Senior Frontend Engineer", department: "Engineering",     location: "Bengaluru", type: "Full-time", openings: 2, status: "Open",   applicants: 18 },
  { id: "J2", title: "HR Business Partner",       department: "Human Resources", location: "Ahmedabad", type: "Full-time", openings: 1, status: "Open",   applicants: 9  },
  { id: "J3", title: "Sales Development Rep",     department: "Sales",           location: "Remote",    type: "Full-time", openings: 3, status: "Open",   applicants: 27 },
  { id: "J4", title: "Content Marketing Lead",    department: "Marketing",       location: "Pune",      type: "Contract",  openings: 1, status: "Closed", applicants: 14 },
  { id: "J5", title: "Financial Analyst",         department: "Finance",         location: "Mumbai",    type: "Full-time", openings: 1, status: "Open",   applicants: 6  },
];

export function genCandidates() {
  const names  = ["Aditi Rao","Yash Trivedi","Simran Kaur","Devansh Patel","Ira Kulkarni","Farhan Sheikh","Naina Bose","Om Deshpande","Zara Khan","Kunal Mehta"];
  const stages = ["Applied","Screening","Interview","Offer","Hired","Rejected"];
  return names.map((n, i) => ({
    id:          "C" + (400 + i),
    name:        n,
    jobId:       JOBS_SEED[i % JOBS_SEED.length].id,
    jobTitle:    JOBS_SEED[i % JOBS_SEED.length].title,
    stage:       stages[i % stages.length],
    email:       n.toLowerCase().replace(" ", ".") + "@mail.com",
    appliedDate: `2026-07-0${(i % 9) + 1}`,
  }));
}

export function genReviews(emps) {
  const reviewers = ["Ravi Malhotra","Anita Desai","Priya Nair","Vikram Rao"];
  return emps.slice(0, 12).map((e, i) => ({
    id:          "R" + (500 + i),
    employeeId:  e.id,
    name:        e.name,
    department:  e.department,
    period:      "H1 2026",
    reviewer:    reviewers[i % reviewers.length],
    rating:      3 + (i % 3),
    status:      i % 4 === 0 ? "Pending" : "Completed",
    comments:    "Consistently meets objectives with strong collaboration across teams.",
  }));
}
