from dateutil.relativedelta import relativedelta

from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated,AllowAny
from rest_framework import status

from .models import Plan, Subscription, Payment
from .serializers import (
    PlanSerializer,
    SubscriptionSerializer,
    PaymentSerializer,
)

class PlanListView(APIView):

    permission_classes = [AllowAny]

    def get(self, request):

        plans = Plan.objects.filter(is_active=True)
        serializer = PlanSerializer(plans,many=True)
        return Response(serializer.data)


class MySubscriptionView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            subscription = request.user.subscription
            subscription.check_expiry()
            serializer = SubscriptionSerializer(subscription)
            return Response(serializer.data)

        except Subscription.DoesNotExist:
            return Response(
                {
                    "has_subscription": False,
                    "message": "No subscription found."
                },
                status=status.HTTP_200_OK
            )

class SubscribeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan_id = request.data.get("plan_id")
        try:
            plan = Plan.objects.get(id=plan_id,is_active=True)
        except Plan.DoesNotExist:

            return Response(
                {
                    "error": "Plan not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        now = timezone.now()

        try:
            subscription = request.user.subscription
            subscription.check_expiry()
            if subscription.is_active:
                start_date = subscription.end_date
            else:
                start_date = now

            end_date = (start_date+ relativedelta(months=plan.duration_months))

            subscription.plan = plan
            subscription.start_date = start_date
            subscription.end_date = end_date
            subscription.status = "active"

            subscription.save()

        except Subscription.DoesNotExist:
            start_date = now
            end_date = (start_date+ relativedelta(months=plan.duration_months))

            subscription = Subscription.objects.create(user=request.user,plan=plan,start_date=start_date,end_date=end_date,status="active")

        Payment.objects.create(user=request.user,subscription=plan,amount=plan.price,status="success")

        serializer = SubscriptionSerializer(subscription)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )

class PaymentHistoryView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        payments = Payment.objects.filter(user=request.user).order_by("-created_at")
        serializer = PaymentSerializer(payments,many=True)

        return Response(serializer.data)