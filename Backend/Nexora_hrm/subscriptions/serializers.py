from rest_framework import serializers
from .models import Plan, Subscription, Payment


class PlanSerializer(serializers.ModelSerializer):

    class Meta:
        model = Plan
        fields = ["id","name","description","price","duration_months",]


class SubscriptionSerializer(serializers.ModelSerializer):

    plan = PlanSerializer(read_only=True)
    is_active = serializers.ReadOnlyField()

    class Meta:
        model = Subscription
        fields = ["id","plan","start_date","end_date","status","auto_renew","is_active",]


class PaymentSerializer(serializers.ModelSerializer):

    class Meta:
        model = Payment
        fields = ["id","amount","payment_id","status","created_at",]