from django.conf import settings
from django.db import models
from django.utils import timezone


class Plan(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10,decimal_places=2)
    duration_months = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Subscription(models.Model):

    STATUS_CHOICES = [
        ("active", "Active"),
        ("expired", "Expired"),
        ("cancelled", "Cancelled"),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="subscription")
    plan = models.ForeignKey(Plan,on_delete=models.PROTECT,related_name="subscriptions")
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    status = models.CharField(max_length=20,choices=STATUS_CHOICES,default="active")
    auto_renew = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_active(self):
        return (
            self.status == "active"
            and self.end_date > timezone.now()
        )

    def check_expiry(self):

        if self.end_date <= timezone.now():

            if self.status == "active":
                self.status = "expired"
                self.save(update_fields=["status"])

            return False

        return True

    def __str__(self):
        return f"{self.user} - {self.plan.name}"


class Payment(models.Model):

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("success", "Success"),
        ("failed", "Failed"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.CASCADE,related_name="payments")
    subscription = models.ForeignKey(Plan,on_delete=models.SET_NULL,null=True,blank=True,related_name="payments")
    amount = models.DecimalField(max_digits=10,decimal_places=2)
    payment_id = models.CharField(max_length=255,blank=True)
    status = models.CharField(max_length=20,choices=STATUS_CHOICES,default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.amount}"