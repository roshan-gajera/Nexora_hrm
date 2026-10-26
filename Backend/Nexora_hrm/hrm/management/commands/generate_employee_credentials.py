from django.core.management.base import BaseCommand
from accounts.models import User
from hrm.models import Employee


class Command(BaseCommand):
    help = "Generate User accounts (login credentials) for all employees existing in the database."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            type=str,
            default="Employee@123",
            help="Default password to set for all employee accounts (default: Employee@123)",
        )
        parser.add_argument(
            "--reset-existing",
            action="store_true",
            help="Reset passwords even for existing employee user accounts",
        )

    def handle(self, *args, **options):
        default_pwd = options["password"]
        reset_existing = options["reset_existing"]

        employees = Employee.objects.all().order_by("id")
        if not employees.exists():
            self.stdout.write(self.style.WARNING("No employees found in the database."))
            return

        self.stdout.write(self.style.SUCCESS(f"\nFound {employees.count()} employee records. Generating credentials...\n"))

        created_count = 0
        updated_count = 0
        skipped_count = 0
        credentials = []

        for emp in employees:
            name_parts = emp.name.strip().split(" ", 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            user, created = User.objects.get_or_create(
                email=emp.email,
                defaults={
                    "first_name": first_name,
                    "last_name": last_name,
                    "role": User.Role.EMPLOYEE,
                    "is_active": True,
                },
            )

            if created:
                user.set_password(default_pwd)
                user.save()
                created_count += 1
                status = "CREATED"
            elif reset_existing:
                user.first_name = first_name or user.first_name
                user.last_name = last_name or user.last_name
                user.role = User.Role.EMPLOYEE
                user.set_password(default_pwd)
                user.is_active = True
                user.save()
                updated_count += 1
                status = "UPDATED"
            else:
                # If user already exists and no reset requested, ensure role is employee
                if user.role != User.Role.EMPLOYEE:
                    user.role = User.Role.EMPLOYEE
                    user.save(update_fields=["role"])
                skipped_count += 1
                status = "EXISTS"

            credentials.append({
                "code": emp.employee_code,
                "name": emp.name,
                "email": emp.email,
                "password": default_pwd if (created or reset_existing) else "(unchanged)",
                "status": status,
            })

        # Pretty table output
        header = f"{'CODE':<8} | {'NAME':<20} | {'USERNAME (EMAIL)':<35} | {'PASSWORD':<15} | {'STATUS'}"
        sep = "-" * len(header)
        self.stdout.write(sep)
        self.stdout.write(header)
        self.stdout.write(sep)
        for c in credentials:
            self.stdout.write(
                f"{c['code']:<8} | {c['name']:<20} | {c['email']:<35} | {c['password']:<15} | {c['status']}"
            )
        self.stdout.write(sep)

        self.stdout.write(
            self.style.SUCCESS(
                f"\nSummary: {created_count} accounts created, {updated_count} updated, {skipped_count} already existed.\n"
                f"Employees can now log in at /login with their email and password to access the Employee Portal.\n"
            )
        )
