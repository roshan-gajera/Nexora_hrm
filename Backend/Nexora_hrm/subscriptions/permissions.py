from rest_framework.permissions import BasePermission

from .models import Subscription


class HasActiveSubscription(BasePermission):

    message = "Your subscription has expired. Please renew your subscription."

    def has_permission(self, request, view):
        
        if not request.user.is_authenticated:
            return False

        try:
            subscription = request.user.subscription
        except Subscription.DoesNotExist:
            return False

        return subscription.check_expiry()