from django.urls import path

from .views import (
    PlanListView,
    MySubscriptionView,
    SubscribeView,
    PaymentHistoryView,
    StripeConfigView,
    CreateStripeCheckoutSessionView,
    VerifyStripeSessionView,
    StripeWebhookView,
)

urlpatterns = [
    path("plans/", PlanListView.as_view(), name="subscription-plans"),
    path("me/", MySubscriptionView.as_view(), name="my-subscription"),
    path("subscribe/", SubscribeView.as_view(), name="subscribe-direct"),
    path("payments/", PaymentHistoryView.as_view(), name="payment-history"),
    # Stripe endpoints
    path("stripe/config/", StripeConfigView.as_view(), name="stripe-config"),
    path("stripe/create-checkout-session/", CreateStripeCheckoutSessionView.as_view(), name="stripe-create-checkout"),
    path("stripe/verify-session/", VerifyStripeSessionView.as_view(), name="stripe-verify-session"),
    path("stripe/webhook/", StripeWebhookView.as_view(), name="stripe-webhook"),
]