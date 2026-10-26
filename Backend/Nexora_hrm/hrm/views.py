from django.db.models import Avg, Count, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from subscriptions.permissions import HasActiveSubscription

from .models import (
    Announcement, Asset, Attendance, Candidate, Department, Designation,
    Employee, Expense, Holiday, Job, LeaveBalance, LeaveRequest, LeaveType,
    Notification, Overtime, Payroll, PerformanceReview, Shift, Training, TrainingEnrollment,
)
from .serializers import (
    AnnouncementSerializer, AssetSerializer, AttendanceListSerializer,
    AttendanceSerializer, CandidateListSerializer, CandidateSerializer,
    DepartmentSerializer, DesignationSerializer, EmployeeListSerializer,
    EmployeeSerializer, ExpenseSerializer, HolidaySerializer,
    JobListSerializer, JobSerializer, LeaveBalanceSerializer,
    LeaveListSerializer, LeaveRequestSerializer, LeaveTypeSerializer,
    NotificationSerializer, OvertimeSerializer, PayrollListSerializer, PayrollSerializer,
    PerformanceListSerializer, PerformanceReviewSerializer, ShiftSerializer,
    TrainingEnrollmentSerializer, TrainingSerializer,
)


def create_notification(title, message, event_type="general", tone="blue", actor_name="", link="", user=None):
    try:
        return Notification.objects.create(
            user=user,
            title=title,
            message=message,
            event_type=event_type,
            tone=tone,
            actor_name=actor_name,
            link=link,
        )
    except Exception:
        return None



# ── Department ────────────────────────────────────────────────────────────────

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset         = Department.objects.all()
    serializer_class = DepartmentSerializer
    search_fields    = ["name", "head"]
    ordering_fields  = ["name"]

    permission_classes = [IsAuthenticated,HasActiveSubscription]

# ── Designation ───────────────────────────────────────────────────────────────

class DesignationViewSet(viewsets.ModelViewSet):
    queryset         = Designation.objects.select_related("department").all()
    serializer_class = DesignationSerializer
    filterset_fields = ["department"]
    search_fields    = ["title"]

    permission_classes = [IsAuthenticated,HasActiveSubscription]

# ── Shift ─────────────────────────────────────────────────────────────────────

class ShiftViewSet(viewsets.ModelViewSet):
    queryset         = Shift.objects.all()
    serializer_class = ShiftSerializer

    permission_classes = [IsAuthenticated,HasActiveSubscription]

# ── Employee ──────────────────────────────────────────────────────────────────

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset         = Employee.objects.select_related("department", "designation", "shift").all()
    filterset_fields = ["status", "department", "location"]
    search_fields    = ["name", "email", "employee_code", "role"]
    ordering_fields  = ["name", "join_date", "salary"]

    def get_serializer_class(self):
        return EmployeeListSerializer if self.action == "list" else EmployeeSerializer

    @action(detail=False, methods=["get"])
    def active(self, request):
        qs = self.queryset.filter(status=Employee.Status.ACTIVE)
        return Response(EmployeeListSerializer(qs, many=True).data)

    def perform_create(self, serializer):
        emp = serializer.save()
        create_notification(
            title="New Employee Joined",
            message=f"joined as {emp.role}",
            event_type="employee",
            tone="teal",
            actor_name=emp.name,
            link="employees",
        )

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        emp = self.get_object()
        emp.status = Employee.Status.INACTIVE
        emp.save(update_fields=["status"])
        return Response({"detail": "Employee deactivated."})


    permission_classes = [IsAuthenticated,HasActiveSubscription]


# ── Holiday ───────────────────────────────────────────────────────────────────

class HolidayViewSet(viewsets.ModelViewSet):
    queryset         = Holiday.objects.all()
    serializer_class = HolidaySerializer
    filterset_fields = ["type"]
    ordering_fields  = ["date"]

    permission_classes = [IsAuthenticated,HasActiveSubscription]



# ── Leave ─────────────────────────────────────────────────────────────────────

class LeaveTypeViewSet(viewsets.ModelViewSet):
    queryset         = LeaveType.objects.all()
    serializer_class = LeaveTypeSerializer

    permission_classes = [IsAuthenticated,HasActiveSubscription]

class LeaveBalanceViewSet(viewsets.ModelViewSet):
    queryset         = LeaveBalance.objects.select_related("employee", "leave_type").all()
    serializer_class = LeaveBalanceSerializer
    filterset_fields = ["employee", "leave_type", "year"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if getattr(user, "role", None) == "employee" or self.request.query_params.get("mine") == "true":
            return qs.filter(employee__email=user.email)
        return qs

    permission_classes = [IsAuthenticated,HasActiveSubscription]


class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset         = LeaveRequest.objects.select_related("employee", "leave_type").all()
    filterset_fields = ["status", "leave_type", "employee"]
    search_fields    = ["employee__name", "status"]
    ordering_fields  = ["from_date", "created_at"]

    def get_serializer_class(self):
        return LeaveListSerializer if self.action == "list" else LeaveRequestSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if getattr(user, "role", None) == "employee" or self.request.query_params.get("mine") == "true":
            return qs.filter(employee__email=user.email)
        return qs

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        user = request.user
        if getattr(user, "role", None) == "employee" or "employee" not in data or not data.get("employee"):
            emp = Employee.objects.filter(email=user.email).first()
            if emp:
                data["employee"] = emp.id

        leave_type_val = data.get("leave_type")
        if leave_type_val and not str(leave_type_val).isdigit():
            lt = LeaveType.objects.filter(name__iexact=str(leave_type_val).strip()).first()
            if not lt:
                lt = LeaveType.objects.create(name=str(leave_type_val).strip())
            data["leave_type"] = lt.id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        leave = serializer.save()
        headers = self.get_success_headers(serializer.data)

        actor = leave.employee.name if leave.employee else "Employee"
        lt_name = leave.leave_type.name if leave.leave_type else "Leave"
        create_notification(
            title=f"Leave Request from {actor}",
            message=f"applied for {lt_name} ({leave.days} day(s))",
            event_type="leave",
            tone="amber",
            actor_name=actor,
            link="leave",
        )

        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        leave = self.get_object()
        if leave.status != LeaveRequest.Status.PENDING:
            return Response({"detail": "Only pending requests can be approved."}, status=400)
        leave.status = LeaveRequest.Status.APPROVED
        leave.save(update_fields=["status"])

        actor = request.user.first_name or "HR Admin"
        create_notification(
            title="Leave Approved",
            message=f"approved {leave.employee.name}'s leave request",
            event_type="leave",
            tone="teal",
            actor_name=actor,
            link="leave",
        )

        return Response(LeaveRequestSerializer(leave).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        leave = self.get_object()
        if leave.status != LeaveRequest.Status.PENDING:
            return Response({"detail": "Only pending requests can be rejected."}, status=400)
        leave.status = LeaveRequest.Status.REJECTED
        leave.save(update_fields=["status"])

        actor = request.user.first_name or "HR Admin"
        create_notification(
            title="Leave Rejected",
            message=f"rejected {leave.employee.name}'s leave request",
            event_type="leave",
            tone="coral",
            actor_name=actor,
            link="leave",
        )

        return Response(LeaveRequestSerializer(leave).data)


    permission_classes = [IsAuthenticated,HasActiveSubscription]

# ── Attendance ────────────────────────────────────────────────────────────────

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset         = Attendance.objects.select_related("employee", "employee__department", "employee__shift").all()
    filterset_fields = ["status", "date", "employee"]
    search_fields    = ["employee__name", "employee__employee_code"]
    ordering_fields  = ["date"]
    pagination_class = None

    def get_serializer_class(self):
        return AttendanceListSerializer if self.action == "list" else AttendanceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if getattr(user, "role", None) == "employee" or self.request.query_params.get("mine") == "true":
            return qs.filter(employee__email=user.email)
        return qs

    def create(self, request, *args, **kwargs):
        emp_id = request.data.get("employee")
        date_val = request.data.get("date") or timezone.localdate()
        if emp_id and date_val:
            existing = Attendance.objects.filter(employee_id=emp_id, date=date_val).first()
            if existing:
                serializer = AttendanceSerializer(existing, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=["get"])
    def today(self, request):
        today = timezone.localdate()
        qs    = self.get_queryset().filter(date=today)
        return Response(AttendanceListSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        date = request.query_params.get("date", str(timezone.localdate()))
        qs   = self.get_queryset().filter(date=date)
        data = qs.values("status").annotate(count=Count("id"))
        total_active = Employee.objects.filter(status=Employee.Status.ACTIVE).count()
        return Response({"date": date, "total_active": total_active, "breakdown": list(data)})

    @action(detail=False, methods=["get"], url_path="today-status")
    def today_status(self, request):
        user = request.user
        emp = Employee.objects.filter(email=user.email).first()
        today = timezone.localdate()

        if not emp:
            return Response({
                "date": str(today),
                "has_punched_in": False,
                "has_punched_out": False,
                "check_in": None,
                "check_out": None,
                "status": None,
                "employee": None,
                "record": None,
            })

        record = Attendance.objects.filter(employee=emp, date=today).first()
        has_punched_in = bool(record and record.check_in and record.check_in != "--")
        has_punched_out = bool(record and record.check_out and record.check_out != "--")

        shift_info = "09:00 AM – 06:00 PM"
        if emp.shift:
            shift_info = f"{emp.shift.name} ({emp.shift.start_time.strftime('%I:%M %p')} – {emp.shift.end_time.strftime('%I:%M %p')})"

        return Response({
            "date": str(today),
            "has_punched_in": has_punched_in,
            "has_punched_out": has_punched_out,
            "check_in": record.check_in if has_punched_in else None,
            "check_out": record.check_out if has_punched_out else None,
            "status": record.status if record else None,
            "shift": shift_info,
            "employee_name": emp.name,
            "employee_code": emp.employee_code,
            "record": AttendanceListSerializer(record).data if record else None,
        })

    @action(detail=False, methods=["post"], url_path="punch-in")
    def punch_in(self, request):
        user = request.user
        emp = None
        if getattr(user, "role", None) != "employee" and request.data.get("employee_id"):
            emp = Employee.objects.filter(id=request.data.get("employee_id")).first()
        if not emp:
            emp = Employee.objects.filter(email=user.email).first()

        if not emp:
            return Response(
                {"detail": "No matching employee profile found for this account."},
                status=status.HTTP_404_NOT_FOUND,
            )

        today = timezone.localdate()
        now = timezone.localtime()
        now_time_str = now.strftime("%I:%M %p")

        record = Attendance.objects.filter(employee=emp, date=today).first()
        if record and record.check_in and record.check_in != "--":
            return Response(
                {
                    "detail": f"You have already punched in today at {record.check_in}.",
                    "has_punched_in": True,
                    "has_punched_out": bool(record.check_out and record.check_out != "--"),
                    "check_in": record.check_in,
                    "check_out": record.check_out,
                    "status": record.status,
                    "record": AttendanceListSerializer(record).data,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        req_status = request.data.get("status")
        final_status = Attendance.Status.PRESENT
        if req_status in [Attendance.Status.WFH, "WFH"]:
            final_status = Attendance.Status.WFH
        elif emp.shift and emp.shift.start_time:
            from datetime import datetime, timedelta
            shift_start = emp.shift.start_time
            grace = emp.shift.grace_mins or 15
            shift_dt = datetime.combine(today, shift_start)
            cutoff_dt = shift_dt + timedelta(minutes=grace)
            now_naive = now.replace(tzinfo=None) if now.tzinfo else now
            if now_naive.time() > cutoff_dt.time():
                final_status = Attendance.Status.LATE
            else:
                final_status = Attendance.Status.PRESENT

        if record:
            record.check_in = now_time_str
            record.status = final_status
            record.save()
        else:
            record = Attendance.objects.create(
                employee=emp,
                date=today,
                check_in=now_time_str,
                check_out="--",
                status=final_status,
            )

        create_notification(
            title="Clocked In",
            message=f"punched in at {now_time_str} ({final_status})",
            event_type="attendance",
            tone="teal" if final_status != Attendance.Status.LATE else "amber",
            actor_name=emp.name,
            link="attendance",
        )

        return Response(
            {
                "detail": f"Punched in successfully at {now_time_str}.",
                "has_punched_in": True,
                "has_punched_out": False,
                "check_in": record.check_in,
                "check_out": record.check_out,
                "status": record.status,
                "date": str(record.date),
                "record": AttendanceListSerializer(record).data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="punch-out")
    def punch_out(self, request):
        user = request.user
        emp = None
        if getattr(user, "role", None) != "employee" and request.data.get("employee_id"):
            emp = Employee.objects.filter(id=request.data.get("employee_id")).first()
        if not emp:
            emp = Employee.objects.filter(email=user.email).first()

        if not emp:
            return Response(
                {"detail": "No matching employee profile found for this account."},
                status=status.HTTP_404_NOT_FOUND,
            )

        today = timezone.localdate()
        now = timezone.localtime()
        now_time_str = now.strftime("%I:%M %p")

        record = Attendance.objects.filter(employee=emp, date=today).first()
        if not record or not record.check_in or record.check_in == "--":
            return Response(
                {"detail": "You must punch in first before punching out."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if record.check_out and record.check_out != "--":
            return Response(
                {
                    "detail": f"You have already punched out today at {record.check_out}.",
                    "has_punched_in": True,
                    "has_punched_out": True,
                    "check_in": record.check_in,
                    "check_out": record.check_out,
                    "status": record.status,
                    "record": AttendanceListSerializer(record).data,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        record.check_out = now_time_str
        record.save(update_fields=["check_out"])

        create_notification(
            title="Clocked Out",
            message=f"checked out at {now_time_str}",
            event_type="attendance",
            tone="blue",
            actor_name=emp.name,
            link="attendance",
        )


        return Response(
            {
                "detail": f"Punched out successfully at {now_time_str}.",
                "has_punched_in": True,
                "has_punched_out": True,
                "check_in": record.check_in,
                "check_out": record.check_out,
                "status": record.status,
                "date": str(record.date),
                "record": AttendanceListSerializer(record).data,
            },
            status=status.HTTP_200_OK,
        )

    permission_classes = [IsAuthenticated,HasActiveSubscription]


# ── Payroll ───────────────────────────────────────────────────────────────────

class PayrollViewSet(viewsets.ModelViewSet):
    queryset         = Payroll.objects.select_related("employee", "employee__department").all()
    filterset_fields = ["status", "month", "employee"]
    search_fields    = ["employee__name", "month"]
    ordering_fields  = ["created_at", "net"]
    pagination_class = None

    def get_serializer_class(self):
        return PayrollListSerializer if self.action == "list" else PayrollSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if getattr(user, "role", None) == "employee" or self.request.query_params.get("mine") == "true":
            return qs.filter(employee__email=user.email)
        return qs

    @action(detail=True, methods=["post"])
    def mark_paid(self, request, pk=None):
        record = self.get_object()
        record.status = Payroll.Status.PAID
        record.save(update_fields=["status"])
        actor = request.user.first_name or "HR Admin"
        create_notification(
            title="Payroll Paid",
            message=f"processed payroll for {record.employee.name} ({record.month})",
            event_type="payroll",
            tone="teal",
            actor_name=actor,
            link="payroll",
        )
        return Response(PayrollSerializer(record).data)

    @action(detail=False, methods=["get"])
    def check_month(self, request):
        month = request.query_params.get("month", "").strip()
        if not month:
            return Response({"detail": "month query parameter is required."}, status=status.HTTP_400_BAD_REQUEST)
        qs = Payroll.objects.filter(month__iexact=month)
        count = qs.count()
        return Response({
            "month": month,
            "exists": count > 0,
            "count": count
        })

    @action(detail=False, methods=["post"])
    def bulk_process(self, request):
        """
        Auto-generate payroll for all active employees for a given month.
        - Basic pay  = Employee's salary (set at joining, stays fixed)
        - Deductions = (salary / 30) × approved leave days in that month
        - Net pay    = basic - deductions
        """
        import calendar
        from datetime import date

        month = request.data.get("month")
        if not month:
            return Response({"detail": "month is required (e.g. 'July 2026')."}, status=status.HTTP_400_BAD_REQUEST)
        month = month.strip()

        # Check if payroll already exists for this month in database
        if Payroll.objects.filter(month__iexact=month).exists():
            return Response(
                {
                    "detail": f"Payroll for {month} already exists in database. Cannot generate payroll twice for the same month.",
                    "already_exists": True,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Parse "July 2026" → (year, month_number)
        try:
            parts = month.strip().split()
            month_names = {
                "January": 1, "February": 2, "March": 3, "April": 4,
                "May": 5, "June": 6, "July": 7, "August": 8,
                "September": 9, "October": 10, "November": 11, "December": 12,
            }
            m_num = month_names.get(parts[0])
            y_num = int(parts[1])
            if not m_num:
                raise ValueError("Invalid month name")
            month_start = date(y_num, m_num, 1)
            month_end   = date(y_num, m_num, calendar.monthrange(y_num, m_num)[1])
        except (IndexError, ValueError, KeyError):
            return Response(
                {"detail": "Invalid month format. Use 'July 2026'."},
                status=400,
            )

        employees = Employee.objects.filter(status=Employee.Status.ACTIVE)
        created = 0
        results = []

        for emp in employees:
            salary = float(emp.salary)
            basic  = round(salary, 2)

            # Count approved leave days that overlap with this month
            approved_leaves = LeaveRequest.objects.filter(
                employee=emp,
                status=LeaveRequest.Status.APPROVED,
                from_date__lte=month_end,
                to_date__gte=month_start,
            )
            total_leave_days = 0
            for leave in approved_leaves:
                # Clamp leave dates to the month boundaries
                eff_start = max(leave.from_date, month_start)
                eff_end   = min(leave.to_date, month_end)
                days_in_month = (eff_end - eff_start).days + 1
                total_leave_days += max(0, days_in_month)

            per_day      = round(salary / 30, 2)
            deductions   = round(per_day * total_leave_days, 2)
            allowances   = 0
            net          = round(max(0, basic + allowances - deductions), 2)

            obj, was_created = Payroll.objects.get_or_create(
                employee=emp, month=month,
                defaults={
                    "basic": basic,
                    "allowances": allowances,
                    "deductions": deductions,
                    "net": net,
                },
            )
            if was_created:
                created += 1
                results.append({
                    "employee": emp.name,
                    "basic": basic,
                    "leave_days": total_leave_days,
                    "deductions": deductions,
                    "net": net,
                })

        return Response({
            "detail": f"Payroll processed for {created} employees.",
            "month": month,
            "records": results,
        })

    permission_classes = [IsAuthenticated,HasActiveSubscription]

# ── Overtime ──────────────────────────────────────────────────────────────────

class OvertimeViewSet(viewsets.ModelViewSet):
    queryset         = Overtime.objects.select_related("employee").all()
    serializer_class = OvertimeSerializer
    filterset_fields = ["status", "employee"]
    ordering_fields  = ["date"]

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        obj = self.get_object()
        obj.status = Overtime.Status.APPROVED
        obj.save(update_fields=["status"])
        return Response(OvertimeSerializer(obj).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        obj = self.get_object()
        obj.status = Overtime.Status.REJECTED
        obj.save(update_fields=["status"])
        return Response(OvertimeSerializer(obj).data)

    permission_classes = [IsAuthenticated,HasActiveSubscription]

# ── Expense ───────────────────────────────────────────────────────────────────

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset         = Expense.objects.select_related("employee").all()
    serializer_class = ExpenseSerializer
    filterset_fields = ["status", "category", "employee"]
    ordering_fields  = ["date", "amount"]

    def perform_create(self, serializer):
        expense = serializer.save()
        actor = expense.employee.name if expense.employee else (self.request.user.first_name or "An employee")
        create_notification(
            title="Expense Claim Submitted",
            message=f"submitted an expense claim for ${expense.amount:.2f} ({expense.category})",
            event_type="expense",
            tone="amber",
            actor_name=actor,
            link="expenses",
        )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        obj = self.get_object()
        obj.status = Expense.Status.APPROVED
        obj.save(update_fields=["status"])
        actor = request.user.first_name or "HR Admin"
        create_notification(
            title="Expense Approved",
            message=f"approved expense of ${obj.amount:.2f} for {obj.employee.name if obj.employee else 'employee'}",
            event_type="expense",
            tone="teal",
            actor_name=actor,
            link="expenses",
        )
        return Response(ExpenseSerializer(obj).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        obj = self.get_object()
        obj.status = Expense.Status.REJECTED
        obj.save(update_fields=["status"])
        actor = request.user.first_name or "HR Admin"
        create_notification(
            title="Expense Rejected",
            message=f"rejected expense claim for {obj.employee.name if obj.employee else 'employee'}",
            event_type="expense",
            tone="coral",
            actor_name=actor,
            link="expenses",
        )
        return Response(ExpenseSerializer(obj).data)

    permission_classes = [IsAuthenticated,HasActiveSubscription]


# ── Recruitment ───────────────────────────────────────────────────────────────

class JobViewSet(viewsets.ModelViewSet):
    queryset         = Job.objects.select_related("department").prefetch_related("candidates").all()
    filterset_fields = ["status", "department", "job_type"]
    search_fields    = ["title", "location"]
    ordering_fields  = ["created_at", "title"]

    def get_serializer_class(self):
        return JobListSerializer if self.action == "list" else JobSerializer

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        job = self.get_object()
        job.status = Job.Status.CLOSED
        job.save(update_fields=["status"])
        return Response({"detail": "Job closed."})

    permission_classes = [IsAuthenticated,HasActiveSubscription]


class CandidateViewSet(viewsets.ModelViewSet):
    queryset         = Candidate.objects.select_related("job").all()
    filterset_fields = ["stage", "job"]
    search_fields    = ["name", "email"]
    ordering_fields  = ["applied_date"]

    def get_serializer_class(self):
        return CandidateListSerializer if self.action == "list" else CandidateSerializer

    @action(detail=True, methods=["post"])
    def move_stage(self, request, pk=None):
        candidate = self.get_object()
        new_stage = request.data.get("stage")
        valid = [s[0] for s in Candidate.Stage.choices]
        if new_stage not in valid:
            return Response({"detail": f"Invalid stage. Choose from: {valid}"}, status=400)
        candidate.stage = new_stage
        candidate.save(update_fields=["stage"])
        actor = request.user.first_name or "HR Admin"
        create_notification(
            title="Candidate Stage Changed",
            message=f"moved {candidate.name} to {new_stage} stage",
            event_type="recruitment",
            tone="blue",
            actor_name=actor,
            link="recruitment",
        )
        return Response(CandidateSerializer(candidate).data)

    permission_classes = [IsAuthenticated,HasActiveSubscription]


# ── Performance ───────────────────────────────────────────────────────────────

class PerformanceReviewViewSet(viewsets.ModelViewSet):
    queryset         = PerformanceReview.objects.select_related("employee", "employee__department").all()
    filterset_fields = ["status", "employee"]
    search_fields    = ["employee__name", "reviewer", "period"]
    ordering_fields  = ["created_at", "rating"]

    def get_serializer_class(self):
        return PerformanceListSerializer if self.action == "list" else PerformanceReviewSerializer

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        review = self.get_object()
        review.status = PerformanceReview.Status.COMPLETED
        review.save(update_fields=["status"])
        return Response(PerformanceReviewSerializer(review).data)

    permission_classes = [IsAuthenticated,HasActiveSubscription]

# ── Training ──────────────────────────────────────────────────────────────────

class TrainingViewSet(viewsets.ModelViewSet):
    queryset         = Training.objects.prefetch_related("enrollments").all()
    serializer_class = TrainingSerializer
    filterset_fields = ["status"]
    search_fields    = ["title", "trainer"]
    ordering_fields  = ["start_date"]

    permission_classes = [IsAuthenticated,HasActiveSubscription]


class TrainingEnrollmentViewSet(viewsets.ModelViewSet):
    queryset         = TrainingEnrollment.objects.select_related("training", "employee").all()
    serializer_class = TrainingEnrollmentSerializer
    filterset_fields = ["training", "employee", "completed"]

    permission_classes = [IsAuthenticated,HasActiveSubscription]


# ── Asset ─────────────────────────────────────────────────────────────────────

class AssetViewSet(viewsets.ModelViewSet):
    queryset         = Asset.objects.select_related("assigned_to").all()
    serializer_class = AssetSerializer
    filterset_fields = ["status", "category", "assigned_to"]
    search_fields    = ["name", "asset_code", "serial_number"]

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        asset       = self.get_object()
        employee_id = request.data.get("employee_id")
        try:
            employee = Employee.objects.get(pk=employee_id)
        except Employee.DoesNotExist:
            return Response({"detail": "Employee not found."}, status=404)
        asset.assigned_to = employee
        asset.status      = Asset.Status.ASSIGNED
        asset.save(update_fields=["assigned_to", "status"])
        return Response(AssetSerializer(asset).data)

    @action(detail=True, methods=["post"])
    def return_asset(self, request, pk=None):
        asset = self.get_object()
        asset.assigned_to = None
        asset.status      = Asset.Status.AVAILABLE
        asset.save(update_fields=["assigned_to", "status"])
        return Response(AssetSerializer(asset).data)

    permission_classes = [IsAuthenticated,HasActiveSubscription]


# ── Announcement ──────────────────────────────────────────────────────────────

class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset         = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    filterset_fields = ["priority", "is_active"]
    ordering_fields  = ["created_at"]

    def perform_create(self, serializer):
        item = serializer.save()
        actor = self.request.user.first_name or "HR Admin"
        create_notification(
            title="New Announcement",
            message=f"posted: {item.title}",
            event_type="announcement",
            tone="blue",
            actor_name=actor,
            link="dashboard",
        )

    permission_classes = [IsAuthenticated,HasActiveSubscription]


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardStatsView(APIView):
    def get(self, request):
        today    = timezone.localdate()
        employees = Employee.objects.all()
        leaves    = LeaveRequest.objects.all()
        att_today = Attendance.objects.filter(date=today)
        payroll   = Payroll.objects.all()

        dept_breakdown = (
            Department.objects
            .annotate(count=Count("employees"))
            .values("name", "color", "count")
        )

        headcount_trend = []
        for i in range(5, -1, -1):
            from dateutil.relativedelta import relativedelta
            month_date = today - relativedelta(months=i)
            label = month_date.strftime("%b")
            count = Employee.objects.filter(join_date__lte=month_date).count()
            headcount_trend.append({"month": label, "count": count})

        return Response({
            "total_employees":  employees.count(),
            "active_employees": employees.filter(status=Employee.Status.ACTIVE).count(),
            "on_leave":         employees.filter(status=Employee.Status.ON_LEAVE).count(),
            "inactive":         employees.filter(status=Employee.Status.INACTIVE).count(),
            "pending_leaves":   leaves.filter(status=LeaveRequest.Status.PENDING).count(),
            "approved_leaves":  leaves.filter(status=LeaveRequest.Status.APPROVED).count(),
            "present_today":    att_today.filter(status=Attendance.Status.PRESENT).count(),
            "late_today":       att_today.filter(status=Attendance.Status.LATE).count(),
            "wfh_today":        att_today.filter(status=Attendance.Status.WFH).count(),
            "absent_today":     att_today.filter(status=Attendance.Status.ABSENT).count(),
            "payroll_pending":  payroll.filter(status=Payroll.Status.PENDING).count(),
            "payroll_total_net": payroll.aggregate(total=Sum("net"))["total"] or 0,
            "open_jobs":        Job.objects.filter(status=Job.Status.OPEN).count(),
            "avg_rating":       PerformanceReview.objects.aggregate(avg=Avg("rating"))["avg"] or 0,
            "dept_breakdown":   list(dept_breakdown),
            "headcount_trend":  headcount_trend,
        })

    permission_classes = [IsAuthenticated,HasActiveSubscription]


# ── Health ────────────────────────────────────────────────────────────────────

class HealthCheckView(APIView):
    permission_classes = []

    def get(self, request):
        return Response({"status": "ok", "service": "Nexora HRM API"})


# ── Notifications ──────────────────────────────────────────────────────────────

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Provides real-time event notifications for the TopBar bell and Dashboard
    Recent Activity feed. Polls via HTTP - no WebSocket needed.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    queryset = Notification.objects.order_by("-created_at")

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()[:50]
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save(update_fields=["is_read"])
        return Response({"id": notif.id, "is_read": True})

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        Notification.objects.filter(is_read=False).update(is_read=True)
        return Response({"marked": "all"})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = Notification.objects.filter(is_read=False).count()
        return Response({"unread": count})

    @action(detail=False, methods=["get"], url_path="activity-feed")
    def activity_feed(self, request):
        """Latest 10 notifications formatted as a Recent Activity feed."""
        items = Notification.objects.order_by("-created_at")[:10]
        return Response(NotificationSerializer(items, many=True).data)

