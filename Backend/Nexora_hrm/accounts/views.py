import uuid
from django.contrib.auth import authenticate
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import (
    ChangePasswordSerializer, LoginSerializer, PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer, RegisterSerializer, UserSerializer,
)


def _token_response(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh), "user": UserSerializer(user).data}


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = RegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = s.save()
        return Response(_token_response(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = LoginSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user = authenticate(request, email=s.validated_data["email"], password=s.validated_data["password"])
        if user is None:
            return Response({"detail": "Invalid email or password."}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(_token_response(user))


class LogoutView(APIView):
    def post(self, request):
        try:
            RefreshToken(request.data["refresh"]).blacklist()
        except Exception:
            pass
        return Response({"detail": "Logged out."})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        s = UserSerializer(request.user, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        s = ChangePasswordSerializer(data=request.data, context={"request": request})
        s.is_valid(raise_exception=True)
        s.save()
        return Response({"detail": "Password changed successfully."})


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = PasswordResetRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        email = s.validated_data["email"]
        try:
            user = User.objects.get(email=email)
            token = str(uuid.uuid4())
            cache.set(f"pwd_reset_{token}", user.pk, timeout=600)   # 10 min
            reset_link = f"http://localhost:5173/reset-password?token={token}"
            send_mail(
                subject="Nexora HRM — Password Reset",
                message=f"Click the link to reset your password:\n{reset_link}\n\nThis link expires in 10 minutes.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=True,
            )
        except User.DoesNotExist:
            pass  # Don't reveal whether email exists
        return Response({"detail": "If that email exists, a reset link has been sent."})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = PasswordResetConfirmSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        token = s.validated_data["token"]
        user_pk = cache.get(f"pwd_reset_{token}")
        if not user_pk:
            return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.get(pk=user_pk)
        user.set_password(s.validated_data["password"])
        user.save(update_fields=["password"])
        cache.delete(f"pwd_reset_{token}")
        return Response({"detail": "Password reset successful."})
