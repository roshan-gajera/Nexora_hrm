from django.contrib import admin

from .models import Plan, Subscription, Payment


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ("name","price","duration_months","is_active",)


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("user","plan","start_date","end_date","status","auto_renew",)

    list_filter = ("status", "auto_renew")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("user","amount","payment_id","status","created_at",)

    list_filter = ("status",)