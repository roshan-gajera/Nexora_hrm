from django.db import models

class Department(models.Model):
    name  = models.CharField(max_length=120, unique=True)
    head  = models.CharField(max_length=120, blank=True)
    color = models.CharField(max_length=20, default="#1F8A70")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Designation(models.Model):
    title      = models.CharField(max_length=120)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="designations")

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return f"{self.title} — {self.department}"


class Shift(models.Model):
    name       = models.CharField(max_length=80)
    start_time = models.TimeField()
    end_time   = models.TimeField()
    grace_mins = models.PositiveSmallIntegerField(default=15)

    def __str__(self):
        return self.name


class Employee(models.Model):
    class Status(models.TextChoices):
        ACTIVE   = "Active",   "Active"
        ON_LEAVE = "On Leave", "On Leave"
        INACTIVE = "Inactive", "Inactive"

    employee_code = models.CharField(max_length=20, unique=True, blank=True)
    name          = models.CharField(max_length=120)
    email         = models.EmailField(unique=True)
    phone         = models.CharField(max_length=20, blank=True)
    role          = models.CharField(max_length=120)
    department    = models.ForeignKey(Department,   on_delete=models.SET_NULL, null=True, related_name="employees")
    designation   = models.ForeignKey(Designation,  on_delete=models.SET_NULL, null=True, blank=True, related_name="employees")
    shift         = models.ForeignKey(Shift,         on_delete=models.SET_NULL, null=True, blank=True, related_name="employees")
    manager       = models.CharField(max_length=120, blank=True)
    status        = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    join_date     = models.DateField()
    salary        = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    location      = models.CharField(max_length=120, blank=True)
    avatar        = models.ImageField(upload_to="avatars/", null=True, blank=True)
    address       = models.TextField(blank=True)
    city          = models.CharField(max_length=80, blank=True)
    state         = models.CharField(max_length=80, blank=True)
    bank_name     = models.CharField(max_length=100, blank=True)
    account_no    = models.CharField(max_length=50,  blank=True)
    ifsc          = models.CharField(max_length=20,  blank=True)
    emergency_name  = models.CharField(max_length=120, blank=True)
    emergency_phone = models.CharField(max_length=20,  blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.employee_code:
            last = Employee.objects.order_by("-id").first()
            self.employee_code = f"E{1000 + ((last.id + 1) if last else 1)}"
        super().save(*args, **kwargs)


class Holiday(models.Model):
    name = models.CharField(max_length=120)
    date = models.DateField(unique=True)
    type = models.CharField(max_length=40, default="Public Holiday")

    class Meta:
        ordering = ["date"]

    def __str__(self):
        return f"{self.name} ({self.date})"



class LeaveType(models.Model):
    name          = models.CharField(max_length=60, unique=True)
    days_allowed  = models.PositiveSmallIntegerField(default=12)
    is_paid       = models.BooleanField(default=True)
    carry_forward = models.BooleanField(default=False)

    def __str__(self):
        return self.name


class LeaveBalance(models.Model):
    employee   = models.ForeignKey(Employee,  on_delete=models.CASCADE, related_name="leave_balances")
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE, related_name="balances")
    year       = models.PositiveSmallIntegerField()
    allocated  = models.PositiveSmallIntegerField(default=0)
    used       = models.PositiveSmallIntegerField(default=0)

    class Meta:
        unique_together = ("employee", "leave_type", "year")

    @property
    def remaining(self):
        return max(0, self.allocated - self.used)

    def __str__(self):
        return f"{self.employee} — {self.leave_type} ({self.year})"


class LeaveRequest(models.Model):
    class Status(models.TextChoices):
        PENDING  = "Pending",  "Pending"
        APPROVED = "Approved", "Approved"
        REJECTED = "Rejected", "Rejected"

    employee   = models.ForeignKey(Employee,  on_delete=models.CASCADE, related_name="leaves")
    leave_type = models.ForeignKey(LeaveType, on_delete=models.SET_NULL, null=True, related_name="requests")
    from_date  = models.DateField()
    to_date    = models.DateField()
    days       = models.PositiveSmallIntegerField(default=1)
    status     = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    reason     = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-from_date"]

    def __str__(self):
        return f"{self.employee.name} — {self.leave_type}"


class Attendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = "Present", "Present"
        LATE    = "Late",    "Late"
        WFH     = "WFH",     "WFH"
        ABSENT  = "Absent",  "Absent"

    employee  = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="attendance")
    date      = models.DateField()
    check_in  = models.CharField(max_length=20, blank=True, default="--")
    check_out = models.CharField(max_length=20, blank=True, default="--")
    status    = models.CharField(max_length=20, choices=Status.choices, default=Status.PRESENT)

    class Meta:
        ordering        = ["-date"]
        unique_together = ("employee", "date")

    def __str__(self):
        return f"{self.employee.name} — {self.date}"


class Payroll(models.Model):
    class Status(models.TextChoices):
        PENDING = "Pending", "Pending"
        PAID    = "Paid",    "Paid"

    employee   = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="payrolls")
    month      = models.CharField(max_length=30)
    basic      = models.DecimalField(max_digits=12, decimal_places=2)
    allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net        = models.DecimalField(max_digits=12, decimal_places=2)
    status     = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.employee.name} — {self.month}"


class Overtime(models.Model):
    class Status(models.TextChoices):
        PENDING  = "Pending",  "Pending"
        APPROVED = "Approved", "Approved"
        REJECTED = "Rejected", "Rejected"

    employee   = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="overtimes")
    date       = models.DateField()
    hours      = models.DecimalField(max_digits=5, decimal_places=2)
    reason     = models.TextField(blank=True)
    status     = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.employee.name} — {self.date} ({self.hours}h)"


class Expense(models.Model):
    class Status(models.TextChoices):
        PENDING  = "Pending",  "Pending"
        APPROVED = "Approved", "Approved"
        REJECTED = "Rejected", "Rejected"

    CATEGORY_CHOICES = [
        ("Travel",        "Travel"),
        ("Food",          "Food"),
        ("Accommodation", "Accommodation"),
        ("Equipment",     "Equipment"),
        ("Other",         "Other"),
    ]

    employee   = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="expenses")
    title      = models.CharField(max_length=200)
    category   = models.CharField(max_length=40, choices=CATEGORY_CHOICES, default="Other")
    amount     = models.DecimalField(max_digits=12, decimal_places=2)
    date       = models.DateField()
    receipt    = models.FileField(upload_to="receipts/", null=True, blank=True)
    notes      = models.TextField(blank=True)
    status     = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.employee.name} — {self.title}"


class Job(models.Model):
    class JobType(models.TextChoices):
        FULL_TIME  = "Full-time",  "Full-time"
        PART_TIME  = "Part-time",  "Part-time"
        CONTRACT   = "Contract",   "Contract"
        INTERNSHIP = "Internship", "Internship"

    class Status(models.TextChoices):
        OPEN   = "Open",   "Open"
        CLOSED = "Closed", "Closed"

    title      = models.CharField(max_length=200)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, related_name="jobs")
    location   = models.CharField(max_length=120)
    job_type   = models.CharField(max_length=20, choices=JobType.choices, default=JobType.FULL_TIME)
    openings   = models.PositiveSmallIntegerField(default=1)
    status     = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    @property
    def applicants(self):
        return self.candidates.count()


class Candidate(models.Model):
    class Stage(models.TextChoices):
        APPLIED    = "Applied",    "Applied"
        SCREENING  = "Screening",  "Screening"
        INTERVIEW  = "Interview",  "Interview"
        OFFER      = "Offer",      "Offer"
        HIRED      = "Hired",      "Hired"
        REJECTED   = "Rejected",   "Rejected"

    job          = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="candidates")
    name         = models.CharField(max_length=120)
    email        = models.EmailField()
    phone        = models.CharField(max_length=20, blank=True)
    resume       = models.FileField(upload_to="resumes/", null=True, blank=True)
    stage        = models.CharField(max_length=20, choices=Stage.choices, default=Stage.APPLIED)
    applied_date = models.DateField()
    notes        = models.TextField(blank=True)

    class Meta:
        ordering = ["-applied_date"]

    def __str__(self):
        return self.name


class PerformanceReview(models.Model):
    class Status(models.TextChoices):
        PENDING   = "Pending",   "Pending"
        COMPLETED = "Completed", "Completed"

    employee   = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="reviews")
    period     = models.CharField(max_length=30)
    reviewer   = models.CharField(max_length=120)
    rating     = models.PositiveSmallIntegerField(default=3)
    status     = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    comments   = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.employee.name} — {self.period}"


class Training(models.Model):
    class Status(models.TextChoices):
        UPCOMING  = "Upcoming",  "Upcoming"
        ONGOING   = "Ongoing",   "Ongoing"
        COMPLETED = "Completed", "Completed"
        CANCELLED = "Cancelled", "Cancelled"

    title      = models.CharField(max_length=200)
    trainer    = models.CharField(max_length=120, blank=True)
    start_date = models.DateField()
    end_date   = models.DateField()
    location   = models.CharField(max_length=200, blank=True)
    status     = models.CharField(max_length=20, choices=Status.choices, default=Status.UPCOMING)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return self.title


class TrainingEnrollment(models.Model):
    training   = models.ForeignKey(Training, on_delete=models.CASCADE, related_name="enrollments")
    employee   = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="trainings")
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed  = models.BooleanField(default=False)
    score      = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    class Meta:
        unique_together = ("training", "employee")

    def __str__(self):
        return f"{self.employee.name} — {self.training.title}"


class Asset(models.Model):
    class Status(models.TextChoices):
        AVAILABLE    = "Available",    "Available"
        ASSIGNED     = "Assigned",     "Assigned"
        UNDER_REPAIR = "Under Repair", "Under Repair"
        DISPOSED     = "Disposed",     "Disposed"

    name          = models.CharField(max_length=200)
    asset_code    = models.CharField(max_length=50, unique=True)
    category      = models.CharField(max_length=80, blank=True)
    serial_number = models.CharField(max_length=100, blank=True)
    purchase_date = models.DateField(null=True, blank=True)
    purchase_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    assigned_to   = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name="assets")
    status        = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    notes         = models.TextField(blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.asset_code})"


class Announcement(models.Model):
    class Priority(models.TextChoices):
        LOW    = "Low",    "Low"
        MEDIUM = "Medium", "Medium"
        HIGH   = "High",   "High"
        URGENT = "Urgent", "Urgent"

    title      = models.CharField(max_length=200)
    content    = models.TextField()
    priority   = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
