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
    Overtime, Payroll, PerformanceReview, Shift, Training, TrainingEnrollment,
)
from .serializers import (
    AnnouncementSerializer, AssetSerializer, AttendanceListSerializer,
    AttendanceSerializer, CandidateListSerializer, CandidateSerializer,
    DepartmentSerializer, DesignationSerializer, EmployeeListSerializer,
    EmployeeSerializer, ExpenseSerializer, HolidaySerializer,
    JobListSerializer, JobSerializer, LeaveBalanceSerializer,
    LeaveListSerializer, LeaveRequestSerializer, LeaveTypeSerializer,
    OvertimeSerializer, PayrollListSerializer, PayrollSerializer,
    PerformanceListSerializer, PerformanceReviewSerializer, ShiftSerializer,
    TrainingEnrollmentSerializer, TrainingSerializer,
)


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

    permission_classes = [IsAuthenticated,HasActiveSubscription]


class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset         = LeaveRequest.objects.select_related("employee", "leave_type").all()
    filterset_fields = ["status", "leave_type", "employee"]
    search_fields    = ["employee__name", "status"]
    ordering_fields  = ["from_date", "created_at"]

    def get_serializer_class(self):
        return LeaveListSerializer if self.action == "list" else LeaveRequestSerializer

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        leave = self.get_object()
        if leave.status != LeaveRequest.Status.PENDING:
            return Response({"detail": "Only pending requests can be approved."}, status=400)
        leave.status = LeaveRequest.Status.APPROVED
        leave.save(update_fields=["status"])
        return Response(LeaveRequestSerializer(leave).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        leave = self.get_object()
        if leave.status != LeaveRequest.Status.PENDING:
            return Response({"detail": "Only pending requests can be rejected."}, status=400)
        leave.status = LeaveRequest.Status.REJECTED
        leave.save(update_fields=["status"])
        return Response(LeaveRequestSerializer(leave).data)

    permission_classes = [IsAuthenticated,HasActiveSubscription]

# ── Attendance ────────────────────────────────────────────────────────────────

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset         = Attendance.objects.select_related("employee", "employee__department").all()
    filterset_fields = ["status", "date", "employee"]
    search_fields    = ["employee__name"]
    ordering_fields  = ["date"]

    def get_serializer_class(self):
        return AttendanceListSerializer if self.action == "list" else AttendanceSerializer

    @action(detail=False, methods=["get"])
    def today(self, request):
        today = timezone.localdate()
        qs    = self.queryset.filter(date=today)
        return Response(AttendanceListSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        date = request.query_params.get("date", str(timezone.localdate()))
        qs   = Attendance.objects.filter(date=date)
        data = qs.values("status").annotate(count=Count("id"))
        total_active = Employee.objects.filter(status=Employee.Status.ACTIVE).count()
        return Response({"date": date, "total_active": total_active, "breakdown": list(data)})


    permission_classes = [IsAuthenticated,HasActiveSubscription]


# ── Payroll ───────────────────────────────────────────────────────────────────

class PayrollViewSet(viewsets.ModelViewSet):
    queryset         = Payroll.objects.select_related("employee", "employee__department").all()
    filterset_fields = ["status", "month", "employee"]
    search_fields    = ["employee__name", "month"]
    ordering_fields  = ["created_at", "net"]

    def get_serializer_class(self):
        return PayrollListSerializer if self.action == "list" else PayrollSerializer

    @action(detail=True, methods=["post"])
    def mark_paid(self, request, pk=None):
        record = self.get_object()
        record.status = Payroll.Status.PAID
        record.save(update_fields=["status"])
        return Response(PayrollSerializer(record).data)

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
            return Response({"detail": "month is required (e.g. 'July 2026')."}, status=400)

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

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        obj = self.get_object()
        obj.status = Expense.Status.APPROVED
        obj.save(update_fields=["status"])
        return Response(ExpenseSerializer(obj).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        obj = self.get_object()
        obj.status = Expense.Status.REJECTED
        obj.save(update_fields=["status"])
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
