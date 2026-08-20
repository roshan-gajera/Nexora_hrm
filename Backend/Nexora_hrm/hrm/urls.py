from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import (
    AnnouncementViewSet, AssetViewSet, AttendanceViewSet, CandidateViewSet,
    DashboardStatsView, DepartmentViewSet, DesignationViewSet, EmployeeViewSet,
    ExpenseViewSet, HealthCheckView, HolidayViewSet, JobViewSet,
    LeaveBalanceViewSet, LeaveRequestViewSet, LeaveTypeViewSet, OvertimeViewSet,
    PayrollViewSet, PerformanceReviewViewSet, ShiftViewSet,
    TrainingEnrollmentViewSet, TrainingViewSet,
)

router = DefaultRouter()
router.register("departments",           DepartmentViewSet,         basename="department")
router.register("designations",          DesignationViewSet,        basename="designation")
router.register("shifts",                ShiftViewSet,              basename="shift")
router.register("employees",             EmployeeViewSet,           basename="employee")
router.register("holidays",              HolidayViewSet,            basename="holiday")
router.register("leave-types",           LeaveTypeViewSet,          basename="leave-type")
router.register("leave-balances",        LeaveBalanceViewSet,       basename="leave-balance")
router.register("leaves",                LeaveRequestViewSet,       basename="leave")
router.register("attendance",            AttendanceViewSet,         basename="attendance")
router.register("payroll",               PayrollViewSet,            basename="payroll")
router.register("overtime",              OvertimeViewSet,           basename="overtime")
router.register("expenses",              ExpenseViewSet,            basename="expense")
router.register("jobs",                  JobViewSet,                basename="job")
router.register("candidates",            CandidateViewSet,          basename="candidate")
router.register("reviews",               PerformanceReviewViewSet,  basename="review")
router.register("training",              TrainingViewSet,           basename="training")
router.register("training-enrollments",  TrainingEnrollmentViewSet, basename="training-enrollment")
router.register("assets",                AssetViewSet,              basename="asset")
router.register("announcements",         AnnouncementViewSet,       basename="announcement")

urlpatterns = [
    path("health/",          HealthCheckView.as_view(),    name="health"),
    path("dashboard/stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("",                 include(router.urls)),
]
