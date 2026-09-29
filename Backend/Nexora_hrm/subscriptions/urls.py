from django.urls import path

from .views import (
    PlanListView,
    MySubscriptionView,
    SubscribeView,
    PaymentHistoryView,
)

urlpatterns = [
    path("plans/",PlanListView.as_view()),
    path("me/",MySubscriptionView.as_view()),
    path("subscribe/",SubscribeView.as_view()),
    path("payments/",PaymentHistoryView.as_view()),
]