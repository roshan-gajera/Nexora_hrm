from django.contrib import admin
from .models import (
    Announcement, Asset, Attendance, Candidate, Department, Designation,
    Employee, Expense, Holiday, Job, LeaveBalance, LeaveRequest, LeaveType,
    Overtime, Payroll, PerformanceReview, Shift, Training, TrainingEnrollment,
)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display  = ("name", "head", "color")
    search_fields = ("name", "head")


@admin.register(Designation)
class DesignationAdmin(admin.ModelAdmin):
    list_display  = ("title", "department")
    list_filter   = ("department",)
    search_fields = ("title",)


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ("name", "start_time", "end_time", "grace_mins")


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display   = ("employee_code", "name", "email", "department", "role", "status", "join_date")
    list_filter    = ("status", "department", "location")
    search_fields  = ("name", "email", "employee_code", "role")
    ordering       = ("name",)
    readonly_fields = ("employee_code", "created_at", "updated_at")


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display  = ("name", "date", "type")
    ordering      = ("date",)


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "days_allowed", "is_paid", "carry_forward")


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display  = ("employee", "leave_type", "year", "allocated", "used")
    list_filter   = ("year", "leave_type")
    search_fields = ("employee__name",)


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display  = ("employee", "leave_type", "from_date", "to_date", "days", "status")
    list_filter   = ("status", "leave_type")
    search_fields = ("employee__name",)
    ordering      = ("-from_date",)


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display  = ("employee", "date", "check_in", "check_out", "status")
    list_filter   = ("status", "date")
    search_fields = ("employee__name",)
    ordering      = ("-date",)


@admin.register(Payroll)
class PayrollAdmin(admin.ModelAdmin):
    list_display  = ("employee", "month", "basic", "allowances", "deductions", "net", "status")
    list_filter   = ("status", "month")
    search_fields = ("employee__name",)


@admin.register(Overtime)
class OvertimeAdmin(admin.ModelAdmin):
    list_display  = ("employee", "date", "hours", "status")
    list_filter   = ("status",)
    search_fields = ("employee__name",)


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display  = ("employee", "title", "category", "amount", "date", "status")
    list_filter   = ("status", "category")
    search_fields = ("employee__name", "title")


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display  = ("title", "department", "location", "job_type", "openings", "status")
    list_filter   = ("status", "job_type", "department")
    search_fields = ("title", "location")


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display  = ("name", "email", "job", "stage", "applied_date")
    list_filter   = ("stage", "job")
    search_fields = ("name", "email")


@admin.register(PerformanceReview)
class PerformanceReviewAdmin(admin.ModelAdmin):
    list_display  = ("employee", "period", "reviewer", "rating", "status")
    list_filter   = ("status", "period")
    search_fields = ("employee__name", "reviewer")


@admin.register(Training)
class TrainingAdmin(admin.ModelAdmin):
    list_display  = ("title", "trainer", "start_date", "end_date", "status")
    list_filter   = ("status",)
    search_fields = ("title", "trainer")


@admin.register(TrainingEnrollment)
class TrainingEnrollmentAdmin(admin.ModelAdmin):
    list_display  = ("employee", "training", "completed", "score", "enrolled_at")
    list_filter   = ("completed", "training")
    search_fields = ("employee__name",)


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display  = ("name", "asset_code", "category", "status", "assigned_to")
    list_filter   = ("status", "category")
    search_fields = ("name", "asset_code", "serial_number")


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display  = ("title", "priority", "is_active", "created_at")
    list_filter   = ("priority", "is_active")
    search_fields = ("title",)
