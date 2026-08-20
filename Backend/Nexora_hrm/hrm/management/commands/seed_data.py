from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
import random

from hrm.models import (
    Announcement, Asset, Attendance, Candidate, Department, Designation,
    Employee, Holiday, Job, LeaveBalance, LeaveRequest, LeaveType,
    Overtime, Payroll, PerformanceReview, Shift, Training, TrainingEnrollment,
)
from accounts.models import User


class Command(BaseCommand):
    help = "Seed Nexora HRM with demo data"

    def handle(self, *args, **kwargs):
        self.stdout.write("Seeding Nexora HRM demo data...")

        # ── Superuser ─────────────────────────────────────────────────────────
        if not User.objects.filter(email="admin@nexorahrm.com").exists():
            User.objects.create_superuser(
                email="admin@nexorahrm.com",
                password="admin123",
                first_name="Priya",
                last_name="Nair",
                role="hr",
            )
            self.stdout.write("  Created superuser: admin@nexorahrm.com / admin123")

        # ── Shifts ────────────────────────────────────────────────────────────
        shifts_data = [
            ("Morning Shift", "08:00", "17:00", 15),
            ("Evening Shift", "14:00", "23:00", 15),
            ("Night Shift",   "22:00", "07:00", 15),
        ]
        shifts = []
        for name, start, end, grace in shifts_data:
            s, _ = Shift.objects.get_or_create(
                name=name,
                defaults={"start_time": start, "end_time": end, "grace_mins": grace},
            )
            shifts.append(s)

        # ── Departments ───────────────────────────────────────────────────────
        dept_data = [
            ("Engineering",     "Ravi Malhotra", "#2A5C9A"),
            ("Sales",           "Anita Desai",   "#1F8A70"),
            ("Marketing",       "Karan Shah",    "#B9790A"),
            ("Human Resources", "Priya Nair",    "#C4432F"),
            ("Finance",         "Vikram Rao",    "#6B46A8"),
            ("Support",         "Meera Iyer",    "#1471A8"),
        ]
        departments = []
        for name, head, color in dept_data:
            d, _ = Department.objects.get_or_create(name=name, defaults={"head": head, "color": color})
            departments.append(d)

        # ── Designations ──────────────────────────────────────────────────────
        desig_data = [
            ("Software Engineer",    "Engineering"),
            ("Product Manager",      "Engineering"),
            ("QA Engineer",          "Engineering"),
            ("Sales Executive",      "Sales"),
            ("Sales Manager",        "Sales"),
            ("Marketing Analyst",    "Marketing"),
            ("Content Writer",       "Marketing"),
            ("HR Specialist",        "Human Resources"),
            ("HR Manager",           "Human Resources"),
            ("Financial Analyst",    "Finance"),
            ("Accountant",           "Finance"),
            ("Support Lead",         "Support"),
            ("Support Engineer",     "Support"),
        ]
        designations = {}
        for title, dept_name in desig_data:
            dept = Department.objects.get(name=dept_name)
            d, _ = Designation.objects.get_or_create(title=title, department=dept)
            designations[title] = d

        # ── Employees ─────────────────────────────────────────────────────────
        employees_data = [
            ("Aarav Sharma",    "aarav.sharma@nexorahrm.com",    "+91 9800000001", "Software Engineer",    "Engineering",     "Active",   date(2021, 3, 15), 75000, "Bengaluru"),
            ("Vivaan Verma",    "vivaan.verma@nexorahrm.com",    "+91 9800000002", "Product Manager",      "Engineering",     "Active",   date(2020, 7, 1),  95000, "Pune"),
            ("Aditya Gupta",    "aditya.gupta@nexorahrm.com",    "+91 9800000003", "QA Engineer",          "Engineering",     "Active",   date(2022, 1, 10), 60000, "Bengaluru"),
            ("Neha Iyer",       "neha.iyer@nexorahrm.com",       "+91 9800000004", "Sales Executive",      "Sales",           "Active",   date(2021, 6, 20), 55000, "Ahmedabad"),
            ("Priya Nair",      "priya.nair@nexorahrm.com",      "+91 9800000005", "HR Manager",           "Human Resources", "Active",   date(2019, 4, 5),  85000, "Ahmedabad"),
            ("Karan Shah",      "karan.shah@nexorahrm.com",      "+91 9800000006", "Marketing Analyst",    "Marketing",       "Active",   date(2022, 9, 1),  58000, "Mumbai"),
            ("Rahul Rao",       "rahul.rao@nexorahrm.com",       "+91 9800000007", "Financial Analyst",    "Finance",         "Active",   date(2021, 11, 15),70000, "Mumbai"),
            ("Ananya Malhotra", "ananya.malhotra@nexorahrm.com", "+91 9800000008", "Support Lead",         "Support",         "Active",   date(2020, 2, 28), 62000, "Remote"),
            ("Diya Shah",       "diya.shah@nexorahrm.com",       "+91 9800000009", "Content Writer",       "Marketing",       "On Leave", date(2023, 1, 3),  48000, "Pune"),
            ("Ishaan Desai",    "ishaan.desai@nexorahrm.com",    "+91 9800000010", "Sales Manager",        "Sales",           "Active",   date(2020, 8, 12), 88000, "Ahmedabad"),
            ("Kabir Kapoor",    "kabir.kapoor@nexorahrm.com",    "+91 9800000011", "Software Engineer",    "Engineering",     "Active",   date(2023, 3, 20), 72000, "Bengaluru"),
            ("Meera Menon",     "meera.menon@nexorahrm.com",     "+91 9800000012", "HR Specialist",        "Human Resources", "Active",   date(2022, 5, 10), 56000, "Ahmedabad"),
            ("Rohan Bhat",      "rohan.bhat@nexorahrm.com",      "+91 9800000013", "Accountant",           "Finance",         "Inactive", date(2021, 7, 7),  52000, "Mumbai"),
            ("Sara Chatterjee", "sara.chatterjee@nexorahrm.com", "+91 9800000014", "Support Engineer",     "Support",         "Active",   date(2022, 11, 1), 50000, "Remote"),
            ("Tara Reddy",      "tara.reddy@nexorahrm.com",      "+91 9800000015", "Software Engineer",    "Engineering",     "Active",   date(2023, 6, 15), 68000, "Bengaluru"),
        ]
        employees = []
        for name, email, phone, role, dept_name, status, join_date, salary, location in employees_data:
            dept  = Department.objects.get(name=dept_name)
            desig = designations.get(role)
            emp, _ = Employee.objects.get_or_create(
                email=email,
                defaults={
                    "name": name, "phone": phone, "role": role,
                    "department": dept, "designation": desig,
                    "shift": random.choice(shifts),
                    "manager": dept.head, "status": status,
                    "join_date": join_date, "salary": salary, "location": location,
                },
            )
            employees.append(emp)
        self.stdout.write(f"  Created {len(employees)} employees")

        # ── Leave Types & Balances ─────────────────────────────────────────────
        leave_types_data = [
            ("Casual Leave",  12, True,  False),
            ("Sick Leave",    10, True,  False),
            ("Earned Leave",  15, True,  True),
            ("Unpaid Leave",  5,  False, False),
        ]
        leave_types = []
        for name, days, paid, carry in leave_types_data:
            lt, _ = LeaveType.objects.get_or_create(
                name=name,
                defaults={"days_allowed": days, "is_paid": paid, "carry_forward": carry},
            )
            leave_types.append(lt)

        year = date.today().year
        for emp in employees:
            for lt in leave_types:
                used = random.randint(0, lt.days_allowed // 3)
                LeaveBalance.objects.get_or_create(
                    employee=emp, leave_type=lt, year=year,
                    defaults={"allocated": lt.days_allowed, "used": used},
                )

        # ── Leave Requests ────────────────────────────────────────────────────
        statuses = ["Pending", "Approved", "Approved", "Rejected"]
        for i, emp in enumerate(employees[:10]):
            from_d = date.today() - timedelta(days=random.randint(1, 30))
            to_d   = from_d + timedelta(days=random.randint(1, 3))
            days   = (to_d - from_d).days + 1
            LeaveRequest.objects.get_or_create(
                employee=emp,
                from_date=from_d,
                defaults={
                    "leave_type": random.choice(leave_types),
                    "to_date": to_d, "days": days,
                    "status": statuses[i % len(statuses)],
                    "reason": random.choice(["Fever", "Family function", "Personal work", "Travel"]),
                },
            )

        # ── Attendance (today) ────────────────────────────────────────────────
        today = date.today()
        att_statuses = ["Present", "Present", "Present", "Late", "WFH", "Absent"]
        for i, emp in enumerate(employees):
            Attendance.objects.get_or_create(
                employee=emp, date=today,
                defaults={
                    "check_in":  "--" if att_statuses[i % 6] == "Absent" else f"0{8 + (i % 2)}:{(i * 7) % 60:02d} AM",
                    "check_out": "--" if att_statuses[i % 6] == "Absent" else f"05:{(i * 11) % 60:02d} PM",
                    "status": att_statuses[i % 6],
                },
            )

        # ── Payroll ───────────────────────────────────────────────────────────
        month = date.today().strftime("%B %Y")
        for i, emp in enumerate(employees):
            salary     = float(emp.salary)
            basic      = round(salary * 0.60, 2)
            allowances = round(salary * 0.30, 2)
            deductions = round(salary * 0.08, 2)
            net        = round(basic + allowances - deductions, 2)
            Payroll.objects.get_or_create(
                employee=emp, month=month,
                defaults={
                    "basic": basic, "allowances": allowances,
                    "deductions": deductions, "net": net,
                    "status": "Pending" if i % 5 == 0 else "Paid",
                },
            )

        # ── Holidays ──────────────────────────────────────────────────────────
        holidays_data = [
            ("Republic Day",       date(year, 1, 26),  "National"),
            ("Holi",               date(year, 3, 25),  "Festival"),
            ("Independence Day",   date(year, 8, 15),  "National"),
            ("Gandhi Jayanti",     date(year, 10, 2),  "National"),
            ("Diwali",             date(year, 10, 20), "Festival"),
            ("Christmas",          date(year, 12, 25), "Festival"),
        ]
        for name, d, htype in holidays_data:
            Holiday.objects.get_or_create(date=d, defaults={"name": name, "type": htype})

        # ── Jobs ──────────────────────────────────────────────────────────────
        jobs_data = [
            ("Senior Frontend Engineer", "Engineering",     "Bengaluru", "Full-time",  2, "Open"),
            ("HR Business Partner",      "Human Resources", "Ahmedabad", "Full-time",  1, "Open"),
            ("Sales Development Rep",    "Sales",           "Remote",    "Full-time",  3, "Open"),
            ("Content Marketing Lead",   "Marketing",       "Pune",      "Contract",   1, "Closed"),
            ("Financial Analyst",        "Finance",         "Mumbai",    "Full-time",  1, "Open"),
        ]
        jobs = []
        for title, dept_name, location, jtype, openings, status in jobs_data:
            dept = Department.objects.get(name=dept_name)
            j, _ = Job.objects.get_or_create(
                title=title,
                defaults={"department": dept, "location": location, "job_type": jtype, "openings": openings, "status": status},
            )
            jobs.append(j)

        # ── Candidates ────────────────────────────────────────────────────────
        candidates_data = [
            ("Aditi Rao",      "aditi.rao@mail.com",      "Applied"),
            ("Yash Trivedi",   "yash.trivedi@mail.com",   "Screening"),
            ("Simran Kaur",    "simran.kaur@mail.com",    "Interview"),
            ("Devansh Patel",  "devansh.patel@mail.com",  "Offer"),
            ("Ira Kulkarni",   "ira.kulkarni@mail.com",   "Hired"),
            ("Farhan Sheikh",  "farhan.sheikh@mail.com",  "Rejected"),
            ("Naina Bose",     "naina.bose@mail.com",     "Applied"),
            ("Om Deshpande",   "om.deshpande@mail.com",   "Screening"),
            ("Zara Khan",      "zara.khan@mail.com",      "Interview"),
            ("Kunal Mehta",    "kunal.mehta@mail.com",    "Applied"),
        ]
        for i, (name, email, stage) in enumerate(candidates_data):
            Candidate.objects.get_or_create(
                email=email,
                defaults={
                    "job": jobs[i % len(jobs)], "name": name,
                    "stage": stage,
                    "applied_date": date.today() - timedelta(days=random.randint(1, 20)),
                },
            )

        # ── Performance Reviews ───────────────────────────────────────────────
        reviewers = ["Ravi Malhotra", "Anita Desai", "Priya Nair", "Vikram Rao"]
        for i, emp in enumerate(employees[:12]):
            PerformanceReview.objects.get_or_create(
                employee=emp, period="H1 2026",
                defaults={
                    "reviewer": reviewers[i % len(reviewers)],
                    "rating":   3 + (i % 3),
                    "status":   "Pending" if i % 4 == 0 else "Completed",
                    "comments": "Consistently meets objectives with strong collaboration.",
                },
            )

        # ── Training ──────────────────────────────────────────────────────────
        trainings_data = [
            ("Django REST Framework",  "Ravi Malhotra", date.today() + timedelta(days=7),  date.today() + timedelta(days=9),  "Upcoming"),
            ("Leadership Skills",      "Priya Nair",    date.today() - timedelta(days=5),  date.today() - timedelta(days=3),  "Completed"),
            ("Sales Techniques",       "Anita Desai",   date.today() + timedelta(days=14), date.today() + timedelta(days=15), "Upcoming"),
        ]
        trainings = []
        for title, trainer, start, end, status in trainings_data:
            t, _ = Training.objects.get_or_create(
                title=title,
                defaults={"trainer": trainer, "start_date": start, "end_date": end, "status": status},
            )
            trainings.append(t)

        for emp in employees[:6]:
            TrainingEnrollment.objects.get_or_create(
                training=trainings[0], employee=emp,
                defaults={"completed": False},
            )

        # ── Assets ────────────────────────────────────────────────────────────
        assets_data = [
            ("MacBook Pro 14",  "AST-001", "Laptop",  "APL-MBP-001", "Assigned",  employees[0]),
            ("Dell Monitor",    "AST-002", "Monitor", "DEL-MON-002", "Assigned",  employees[1]),
            ("iPhone 15",       "AST-003", "Phone",   "APL-IPH-003", "Available", None),
            ("Office Chair",    "AST-004", "Furniture","OFC-CHR-004", "Available", None),
            ("HP Laptop",       "AST-005", "Laptop",  "HP-LAP-005",  "Assigned",  employees[2]),
        ]
        for name, code, cat, serial, status, assigned_to in assets_data:
            Asset.objects.get_or_create(
                asset_code=code,
                defaults={
                    "name": name, "category": cat, "serial_number": serial,
                    "status": status, "assigned_to": assigned_to,
                    "purchase_date": date(2023, 1, 1), "purchase_cost": 50000,
                },
            )

        # ── Overtime ──────────────────────────────────────────────────────────
        for i, emp in enumerate(employees[:5]):
            Overtime.objects.get_or_create(
                employee=emp,
                date=date.today() - timedelta(days=i + 1),
                defaults={
                    "hours": round(random.uniform(1, 4), 1),
                    "reason": "Project deadline",
                    "status": "Approved" if i % 2 == 0 else "Pending",
                },
            )

        # ── Announcements ─────────────────────────────────────────────────────
        ann_data = [
            ("Q3 Performance Reviews Starting",  "Performance review cycle for Q3 2026 begins next Monday.",          "High"),
            ("Office Closed on Diwali",           "The office will remain closed on October 20th for Diwali.",         "Medium"),
            ("New Leave Policy Update",           "Updated leave policy is now effective. Please check HR portal.",    "Urgent"),
            ("Team Outing — August 10",           "Annual team outing scheduled for August 10. Register by August 5.", "Low"),
        ]
        for title, content, priority in ann_data:
            Announcement.objects.get_or_create(
                title=title,
                defaults={"content": content, "priority": priority, "is_active": True},
            )

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully!"))
        self.stdout.write("  Login: admin@nexorahrm.com / admin123")
