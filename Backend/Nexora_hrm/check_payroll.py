import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "Nexora_hrm.settings")
django.setup()

from hrm.models import Payroll, Employee

total_emp = Employee.objects.count()
total_payroll = Payroll.objects.count()

print(f"Total employees: {total_emp}")
print(f"Total payroll records: {total_payroll}")
print()

print("Payroll records:")
for p in Payroll.objects.select_related("employee", "employee__department").all():
    emp_name = p.employee.name if p.employee else "DELETED"
    print(f"  ID={p.id} | {emp_name} | {p.month} | basic={p.basic} | net={p.net}")

# Check for employees with multiple payroll records
from django.db.models import Count
dupes = Payroll.objects.values("employee__name", "month").annotate(cnt=Count("id")).filter(cnt__gt=1)
if dupes:
    print("\nDuplicate payroll (same employee + month):")
    for d in dupes:
        print(f"  {d['employee__name']} - {d['month']} ({d['cnt']} records)")
