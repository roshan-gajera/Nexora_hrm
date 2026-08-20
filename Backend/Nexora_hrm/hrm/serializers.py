from rest_framework import serializers
from .models import (
    Announcement, Asset, Attendance, Candidate, Department, Designation,
    Employee, Expense, Holiday, Job, LeaveBalance, LeaveRequest, LeaveType,
    Overtime, Payroll, PerformanceReview, Shift, Training, TrainingEnrollment,
)


# ── Department ────────────────────────────────────────────────────────────────

class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model  = Department
        fields = ("id", "name", "head", "color", "employee_count")

    def get_employee_count(self, obj):
        return obj.employees.count()


# ── Designation ───────────────────────────────────────────────────────────────

class DesignationSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model  = Designation
        fields = ("id", "title", "department", "department_name")


# ── Shift ─────────────────────────────────────────────────────────────────────

class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Shift
        fields = ("id", "name", "start_time", "end_time", "grace_mins")


# ── Employee ──────────────────────────────────────────────────────────────────

class EmployeeSerializer(serializers.ModelSerializer):
    department_name  = serializers.CharField(source="department.name",       read_only=True)
    designation_name = serializers.CharField(source="designation.title",     read_only=True)
    shift_name       = serializers.CharField(source="shift.name",            read_only=True)

    class Meta:
        model  = Employee
        fields = (
            "id", "employee_code", "name", "email", "phone", "role",
            "department", "department_name", "designation", "designation_name",
            "shift", "shift_name", "manager", "status",
            "join_date", "salary", "location", "avatar",
            "address", "city", "state",
            "bank_name", "account_no", "ifsc",
            "emergency_name", "emergency_phone",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "employee_code", "created_at", "updated_at")


class EmployeeListSerializer(serializers.ModelSerializer):
    """Flat shape matching the React frontend mock data keys."""
    id         = serializers.CharField(source="employee_code", read_only=True)
    pk         = serializers.IntegerField(source="id", read_only=True)
    department = serializers.CharField(source="department.name", read_only=True)
    joinDate   = serializers.DateField(source="join_date")

    class Meta:
        model  = Employee
        fields = ("id", "pk", "name", "email", "phone", "role", "department", "manager", "status", "joinDate", "salary", "location")



# ── Holiday ───────────────────────────────────────────────────────────────────

class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Holiday
        fields = ("id", "name", "date", "type")


# ── Leave ─────────────────────────────────────────────────────────────────────

class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = LeaveType
        fields = ("id", "name", "days_allowed", "is_paid", "carry_forward")


class LeaveBalanceSerializer(serializers.ModelSerializer):
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    employee_name   = serializers.CharField(source="employee.name",   read_only=True)
    remaining       = serializers.ReadOnlyField()

    class Meta:
        model  = LeaveBalance
        fields = ("id", "employee", "employee_name", "leave_type", "leave_type_name", "year", "allocated", "used", "remaining")


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name   = serializers.CharField(source="employee.name",       read_only=True)
    employee_code   = serializers.CharField(source="employee.employee_code", read_only=True)
    leave_type_name = serializers.CharField(source="leave_type.name",     read_only=True)
    name            = serializers.CharField(source="employee.name",       read_only=True)

    class Meta:
        model  = LeaveRequest
        fields = (
            "id", "employee", "employee_name", "employee_code", "name",
            "leave_type", "leave_type_name", "from_date", "to_date",
            "days", "status", "reason", "created_at",
        )
        read_only_fields = ("id", "created_at")


class LeaveListSerializer(serializers.ModelSerializer):
    employeeId = serializers.CharField(source="employee.employee_code", read_only=True)
    name       = serializers.CharField(source="employee.name",          read_only=True)
    type       = serializers.CharField(source="leave_type.name",        read_only=True)
    from_field = serializers.DateField(source="from_date")
    to         = serializers.DateField(source="to_date")

    class Meta:
        model  = LeaveRequest
        fields = ("id", "employeeId", "name", "type", "from_field", "to", "days", "status", "reason")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["from"] = data.pop("from_field")
        return data


# ── Attendance ────────────────────────────────────────────────────────────────

class AttendanceSerializer(serializers.ModelSerializer):
    employee_name   = serializers.CharField(source="employee.name",            read_only=True)
    department_name = serializers.CharField(source="employee.department.name", read_only=True)

    class Meta:
        model  = Attendance
        fields = ("id", "employee", "employee_name", "department_name", "date", "check_in", "check_out", "status")


class AttendanceListSerializer(serializers.ModelSerializer):
    employeeId = serializers.CharField(source="employee.employee_code",        read_only=True)
    name       = serializers.CharField(source="employee.name",                 read_only=True)
    department = serializers.CharField(source="employee.department.name",      read_only=True)
    checkIn    = serializers.CharField(source="check_in")
    checkOut   = serializers.CharField(source="check_out")

    class Meta:
        model  = Attendance
        fields = ("employeeId", "name", "department", "checkIn", "checkOut", "status", "date")


# ── Payroll ───────────────────────────────────────────────────────────────────

class PayrollSerializer(serializers.ModelSerializer):
    employee_name   = serializers.CharField(source="employee.name",            read_only=True)
    department_name = serializers.CharField(source="employee.department.name", read_only=True)

    class Meta:
        model  = Payroll
        fields = ("id", "employee", "employee_name", "department_name", "month", "basic", "allowances", "deductions", "net", "status", "created_at")
        read_only_fields = ("id", "created_at")


class PayrollListSerializer(serializers.ModelSerializer):
    employeeId = serializers.CharField(source="employee.employee_code",        read_only=True)
    name       = serializers.CharField(source="employee.name",                 read_only=True)
    department = serializers.CharField(source="employee.department.name",      read_only=True)

    class Meta:
        model  = Payroll
        fields = ("id", "employeeId", "name", "department", "month", "basic", "allowances", "deductions", "net", "status")


# ── Overtime ──────────────────────────────────────────────────────────────────

class OvertimeSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.name", read_only=True)

    class Meta:
        model  = Overtime
        fields = ("id", "employee", "employee_name", "date", "hours", "reason", "status", "created_at")
        read_only_fields = ("id", "created_at")


# ── Expense ───────────────────────────────────────────────────────────────────

class ExpenseSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.name", read_only=True)

    class Meta:
        model  = Expense
        fields = ("id", "employee", "employee_name", "title", "category", "amount", "date", "receipt", "notes", "status", "created_at")
        read_only_fields = ("id", "created_at")


# ── Recruitment ───────────────────────────────────────────────────────────────

class JobSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    applicants      = serializers.ReadOnlyField()

    class Meta:
        model  = Job
        fields = ("id", "title", "department", "department_name", "location", "job_type", "openings", "status", "description", "applicants", "created_at")
        read_only_fields = ("id", "created_at")


class JobListSerializer(serializers.ModelSerializer):
    department = serializers.CharField(source="department.name", read_only=True)
    type       = serializers.CharField(source="job_type")
    applicants = serializers.ReadOnlyField()

    class Meta:
        model  = Job
        fields = ("id", "title", "department", "location", "type", "openings", "status", "applicants")


class CandidateSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source="job.title", read_only=True)

    class Meta:
        model  = Candidate
        fields = ("id", "job", "job_title", "name", "email", "phone", "resume", "stage", "applied_date", "notes")


class CandidateListSerializer(serializers.ModelSerializer):
    jobId       = serializers.IntegerField(source="job_id",    read_only=True)
    jobTitle    = serializers.CharField(source="job.title",    read_only=True)
    appliedDate = serializers.DateField(source="applied_date")

    class Meta:
        model  = Candidate
        fields = ("id", "name", "jobId", "jobTitle", "stage", "email", "appliedDate")


# ── Performance ───────────────────────────────────────────────────────────────

class PerformanceReviewSerializer(serializers.ModelSerializer):
    employee_name   = serializers.CharField(source="employee.name",            read_only=True)
    department_name = serializers.CharField(source="employee.department.name", read_only=True)

    class Meta:
        model  = PerformanceReview
        fields = ("id", "employee", "employee_name", "department_name", "period", "reviewer", "rating", "status", "comments", "created_at")
        read_only_fields = ("id", "created_at")


class PerformanceListSerializer(serializers.ModelSerializer):
    employeeId = serializers.CharField(source="employee.employee_code",        read_only=True)
    name       = serializers.CharField(source="employee.name",                 read_only=True)
    department = serializers.CharField(source="employee.department.name",      read_only=True)

    class Meta:
        model  = PerformanceReview
        fields = ("id", "employeeId", "name", "department", "period", "reviewer", "rating", "status", "comments")


# ── Training ──────────────────────────────────────────────────────────────────

class TrainingSerializer(serializers.ModelSerializer):
    enrollment_count = serializers.SerializerMethodField()

    class Meta:
        model  = Training
        fields = ("id", "title", "trainer", "start_date", "end_date", "location", "status", "description", "enrollment_count", "created_at")
        read_only_fields = ("id", "created_at")

    def get_enrollment_count(self, obj):
        return obj.enrollments.count()


class TrainingEnrollmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.name",   read_only=True)
    training_title = serializers.CharField(source="training.title", read_only=True)

    class Meta:
        model  = TrainingEnrollment
        fields = ("id", "training", "training_title", "employee", "employee_name", "enrolled_at", "completed", "score")
        read_only_fields = ("id", "enrolled_at")


# ── Asset ─────────────────────────────────────────────────────────────────────

class AssetSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source="assigned_to.name", read_only=True)

    class Meta:
        model  = Asset
        fields = ("id", "name", "asset_code", "category", "serial_number", "purchase_date", "purchase_cost", "assigned_to", "assigned_to_name", "status", "notes", "created_at")
        read_only_fields = ("id", "created_at")


# ── Announcement ──────────────────────────────────────────────────────────────

class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Announcement
        fields = ("id", "title", "content", "priority", "is_active", "created_at")
        read_only_fields = ("id", "created_at")
