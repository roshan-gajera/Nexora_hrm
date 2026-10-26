import json
import logging
import stripe
from dateutil.relativedelta import relativedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status

from .models import Plan, Subscription, Payment
from .serializers import (
    PlanSerializer,
    SubscriptionSerializer,
    PaymentSerializer,
)

logger = logging.getLogger(__name__)
User = get_user_model()


def activate_or_renew_subscription(user, plan, payment_id="", payment_method="stripe"):
    """
    Helper function to activate a new subscription or extend an active subscription.
    Also creates a Payment success record.
    """
    now = timezone.now()

    try:
        subscription = user.subscription
        subscription.check_expiry()
        if subscription.is_active:
            # Extend from current subscription end_date
            start_date = subscription.end_date
        else:
            start_date = now

        end_date = start_date + relativedelta(months=plan.duration_months)

        subscription.plan = plan
        subscription.start_date = start_date
        subscription.end_date = end_date
        subscription.status = "active"
        subscription.save()

    except Subscription.DoesNotExist:
        start_date = now
        end_date = start_date + relativedelta(months=plan.duration_months)
        subscription = Subscription.objects.create(
            user=user,
            plan=plan,
            start_date=start_date,
            end_date=end_date,
            status="active"
        )

    # Record successful payment
    Payment.objects.create(
        user=user,
        subscription=plan,
        amount=plan.price,
        payment_id=payment_id or f"pay_{int(now.timestamp())}",
        payment_method=payment_method,
        status="success"
    )

    return subscription


class PlanListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        plans = Plan.objects.filter(is_active=True).order_by("price")
        serializer = PlanSerializer(plans, many=True)
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
    """Direct subscription endpoint (manual / complimentary)"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan_id = request.data.get("plan_id")
        try:
            plan = Plan.objects.get(id=plan_id, is_active=True)
        except Plan.DoesNotExist:
            return Response(
                {"error": "Plan not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        subscription = activate_or_renew_subscription(
            user=request.user,
            plan=plan,
            payment_id=f"manual_{int(timezone.now().timestamp())}",
            payment_method="direct"
        )

        serializer = SubscriptionSerializer(subscription)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class StripeConfigView(APIView):
    """
    Returns public Stripe configuration so the frontend knows if Stripe
    is configured with real live/test keys or in simulation mode.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        has_secret_key = bool(
            getattr(settings, "STRIPE_SECRET_KEY", "") and
            settings.STRIPE_SECRET_KEY.startswith("sk_")
        )
        return Response({
            "publishable_key": getattr(settings, "STRIPE_PUBLISHABLE_KEY", ""),
            "currency": getattr(settings, "STRIPE_CURRENCY", "inr").upper(),
            "is_configured": has_secret_key,
        })


class CreateStripeCheckoutSessionView(APIView):
    """
    Creates a Stripe Checkout Session for subscription payment.
    If Stripe secret key is not configured, provides a seamless test mode response.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan_id = request.data.get("plan_id")
        if not plan_id:
            return Response(
                {"error": "plan_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            plan = Plan.objects.get(id=plan_id, is_active=True)
        except Plan.DoesNotExist:
            return Response(
                {"error": "Plan not found or inactive."},
                status=status.HTTP_404_NOT_FOUND
            )

        secret_key = getattr(settings, "STRIPE_SECRET_KEY", "").strip()
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")
        currency = getattr(settings, "STRIPE_CURRENCY", "inr").lower()

        # If real Stripe secret key is configured, create an authentic Stripe Checkout Session
        if secret_key and secret_key.startswith("sk_"):
            try:
                stripe.api_key = secret_key

                success_url = (
                    f"{frontend_url}/subscription?payment_status=success"
                    f"&session_id={{CHECKOUT_SESSION_ID}}&plan_id={plan.id}"
                )
                cancel_url = f"{frontend_url}/subscription?payment_status=cancelled"

                # Calculate amount in smallest currency unit (paise/cents)
                unit_amount = int(float(plan.price) * 100)

                session = stripe.checkout.Session.create(
                    payment_method_types=["card"],
                    line_items=[{
                        "price_data": {
                            "currency": currency,
                            "unit_amount": unit_amount,
                            "product_data": {
                                "name": f"Nexora HRM - {plan.name} Plan",
                                "description": plan.description or f"{plan.duration_months} month(s) subscription",
                            },
                        },
                        "quantity": 1,
                    }],
                    mode="payment",
                    customer_email=request.user.email if request.user.email else None,
                    client_reference_id=str(request.user.id),
                    metadata={
                        "user_id": str(request.user.id),
                        "plan_id": str(plan.id),
                    },
                    success_url=success_url,
                    cancel_url=cancel_url,
                )

                return Response({
                    "checkout_url": session.url,
                    "session_id": session.id,
                    "is_mock": False,
                    "plan_name": plan.name,
                    "amount": float(plan.price),
                })
            except stripe.error.StripeError as e:
                logger.error(f"Stripe error: {str(e)}")
                return Response(
                    {"error": f"Stripe gateway error: {str(e)}"},
                    status=status.HTTP_502_BAD_GATEWAY
                )
            except Exception as e:
                logger.error(f"Unexpected error creating checkout session: {str(e)}")
                return Response(
                    {"error": f"Failed to initialize Stripe payment: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        # Fallback / Simulation mode when Stripe keys haven't been pasted into .env yet
        mock_session_id = f"mock_stripe_{int(timezone.now().timestamp())}_{plan.id}"
        return Response({
            "is_mock": True,
            "session_id": mock_session_id,
            "plan_id": plan.id,
            "plan_name": plan.name,
            "amount": float(plan.price),
            "currency": currency.upper(),
            "message": "Stripe test mode simulated (Add STRIPE_SECRET_KEY to .env for live Stripe Checkout).",
        })


class VerifyStripeSessionView(APIView):
    """
    Verifies a completed Stripe Checkout session and activates the user's subscription.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_id = request.data.get("session_id", "").strip()
        plan_id = request.data.get("plan_id")

        if not session_id:
            return Response(
                {"error": "session_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Handle Mock / Simulated session
        if session_id.startswith("mock_stripe_"):
            if not plan_id:
                # Extract plan_id from session string if possible
                parts = session_id.split("_")
                if len(parts) >= 4 and parts[3].isdigit():
                    plan_id = int(parts[3])

            try:
                plan = Plan.objects.get(id=plan_id, is_active=True)
            except (Plan.DoesNotExist, TypeError, ValueError):
                return Response({"error": "Plan not found."}, status=status.HTTP_404_NOT_FOUND)

            # Check if this simulated session was already recorded
            existing_payment = Payment.objects.filter(payment_id=session_id).first()
            if existing_payment:
                sub = getattr(request.user, "subscription", None)
                sub_data = SubscriptionSerializer(sub).data if sub else None
                return Response({
                    "message": "Payment already verified.",
                    "subscription": sub_data,
                })

            subscription = activate_or_renew_subscription(
                user=request.user,
                plan=plan,
                payment_id=session_id,
                payment_method="stripe_simulated"
            )
            return Response({
                "message": f"Successfully subscribed to {plan.name} plan via Stripe (Test Mode)!",
                "subscription": SubscriptionSerializer(subscription).data,
            })

        # Real Stripe session verification
        secret_key = getattr(settings, "STRIPE_SECRET_KEY", "").strip()
        if not secret_key:
            return Response(
                {"error": "Stripe secret key is not configured on the server."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        try:
            stripe.api_key = secret_key
            session = stripe.checkout.Session.retrieve(session_id)

            if session.payment_status != "paid":
                return Response(
                    {"error": f"Payment status is '{session.payment_status}'. Only completed payments can be activated."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Identify plan
            target_plan_id = plan_id or (session.metadata and session.metadata.get("plan_id"))
            try:
                plan = Plan.objects.get(id=target_plan_id, is_active=True)
            except (Plan.DoesNotExist, TypeError, ValueError):
                return Response({"error": "Plan not found."}, status=status.HTTP_404_NOT_FOUND)

            # Prevent duplicate activation
            payment_ref = session.payment_intent or session.id
            existing_payment = Payment.objects.filter(payment_id=payment_ref).first()
            if existing_payment:
                sub = getattr(request.user, "subscription", None)
                sub_data = SubscriptionSerializer(sub).data if sub else None
                return Response({
                    "message": "Payment already processed.",
                    "subscription": sub_data,
                })

            subscription = activate_or_renew_subscription(
                user=request.user,
                plan=plan,
                payment_id=payment_ref,
                payment_method="stripe"
            )

            return Response({
                "message": f"Payment of ₹{plan.price} received! You are now subscribed to {plan.name}.",
                "subscription": SubscriptionSerializer(subscription).data,
            })

        except stripe.error.StripeError as e:
            logger.error(f"Stripe retrieval error: {str(e)}")
            return Response(
                {"error": f"Failed to verify with Stripe: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )
        except Exception as e:
            logger.error(f"Error in VerifyStripeSessionView: {str(e)}")
            return Response(
                {"error": f"Internal error during payment verification: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    """
    Webhook handler for Stripe asynchronous events.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")
        webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", "")

        event = None

        if webhook_secret and sig_header:
            try:
                event = stripe.Webhook.construct_event(
                    payload, sig_header, webhook_secret
                )
            except ValueError:
                return Response({"error": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)
            except stripe.error.SignatureVerificationError:
                return Response({"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            try:
                event = json.loads(payload.decode("utf-8"))
            except Exception:
                return Response({"error": "Invalid JSON"}, status=status.HTTP_400_BAD_REQUEST)

        event_type = event.get("type") if isinstance(event, dict) else getattr(event, "type", "")

        if event_type == "checkout.session.completed":
            session = event.get("data", {}).get("object", {}) if isinstance(event, dict) else event.data.object
            user_id = session.get("metadata", {}).get("user_id") if isinstance(session, dict) else getattr(session.metadata, "user_id", None)
            plan_id = session.get("metadata", {}).get("plan_id") if isinstance(session, dict) else getattr(session.metadata, "plan_id", None)
            payment_id = session.get("payment_intent") or session.get("id") if isinstance(session, dict) else (getattr(session, "payment_intent", None) or getattr(session, "id", ""))

            if user_id and plan_id:
                try:
                    user = User.objects.get(id=user_id)
                    plan = Plan.objects.get(id=plan_id)
                    # Check if already recorded
                    if not Payment.objects.filter(payment_id=payment_id).exists():
                        activate_or_renew_subscription(
                            user=user,
                            plan=plan,
                            payment_id=payment_id,
                            payment_method="stripe"
                        )
                except Exception as e:
                    logger.error(f"Error processing checkout.session.completed webhook: {str(e)}")

        return Response({"status": "success"}, status=status.HTTP_200_OK)


class PaymentHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payments = Payment.objects.filter(user=request.user).order_by("-created_at")
        serializer = PaymentSerializer(payments, many=True)
        return Response(serializer.data)