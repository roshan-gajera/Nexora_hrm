import random
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
        email = request.data.get("email")
        password = request.data.get("password")
        user = authenticate(
            request,
            email=email,
            password=password
        )

        if user is None:
            return Response(
                {
                    "detail": "Invalid email or password."
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {"id": user.id, "email": user.email, "role": user.role, "first_name": user.first_name, "last_name": user.last_name}
        })


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
        user = request.user
        old_email = user.email
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        password = data.pop("password", None)

        # Validate email uniqueness if changing email
        new_email = data.get("email")
        if new_email and new_email.lower().strip() != old_email.lower().strip():
            clean_email = new_email.lower().strip()
            if User.objects.filter(email__iexact=clean_email).exclude(pk=user.pk).exists():
                return Response(
                    {"detail": "This email address is already in use by another account."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            data["email"] = clean_email

        s = UserSerializer(user, data=data, partial=True)
        s.is_valid(raise_exception=True)
        user = s.save()

        # Update password if provided
        if password and str(password).strip():
            raw_password = str(password).strip()
            if len(raw_password) < 6:
                return Response(
                    {"detail": "Password must be at least 6 characters long."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.set_password(raw_password)
            user.save(update_fields=["password"])

        # Sync matching employee record if email or name changed
        if new_email and new_email.lower().strip() != old_email.lower().strip():
            try:
                from hrm.models import Employee
                Employee.objects.filter(email__iexact=old_email).update(
                    email=user.email,
                    name=user.full_name or user.email
                )
            except Exception:
                pass

        # Issue fresh tokens so the session remains authenticated
        refresh = RefreshToken.for_user(user)

        return Response({
            "user": UserSerializer(user).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "detail": "Account credentials updated directly in database."
        })


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
        if not s.is_valid():
            email_errors = s.errors.get("email", [])
            detail = email_errors[0] if email_errors else "Please enter a valid email address."
            return Response({"detail": str(detail)}, status=status.HTTP_400_BAD_REQUEST)

        email = s.validated_data["email"].strip().lower()

        # Validate that the user exists in the database
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response(
                {"detail": f"No account found with '{email}'. Please check the email and try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_active:
            return Response(
                {"detail": "This account is currently inactive. Please contact HR administration."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp = str(random.randint(100000, 999999))
        cache.set(f"pwd_reset_otp_{email}", otp, timeout=600)  # 10 min

        try:
            html_message = f"""
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
                <div style="text-align: center; margin-bottom: 28px;">
                    <div style="display: inline-flex; align-items: center; gap: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 8px; background: #14213d; display: flex; align-items: center; justify-content: center;">
                            <span style="color: #1f8a70; font-weight: 800; font-size: 18px;">N</span>
                        </div>
                        <span style="font-weight: 700; font-size: 18px; color: #14213d;">Nexora HRM</span>
                    </div>
                </div>
                <h2 style="color: #14213d; font-size: 22px; margin: 0 0 10px; text-align: center;">Password Reset Request</h2>
                <p style="color: #5c6b7a; font-size: 14px; line-height: 1.6; text-align: center;">
                    Hi {user.first_name or 'there'}, we received a request to reset your password.
                    Use the OTP below to proceed:
                </p>
                <div style="background: #f4f6f9; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                    <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #14213d; font-family: 'IBM Plex Mono', monospace;">
                        {otp}
                    </div>
                    <p style="color: #5c6b7a; font-size: 12px; margin: 10px 0 0;">This code expires in <strong>10 minutes</strong>.</p>
                </div>
                <p style="color: #5c6b7a; font-size: 13px; line-height: 1.5; text-align: center;">
                    If you didn't request this, you can safely ignore this email.
                    Your password will remain unchanged.
                </p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                <p style="color: #94a3b8; font-size: 11px; text-align: center;">
                    &copy; Nexora HRM &mdash; Secure HR Management
                </p>
            </div>
            """

            send_mail(
                subject="Nexora HRM — Your Password Reset OTP",
                message=f"Your OTP to reset your Nexora HRM password is: {otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                html_message=html_message,
                fail_silently=False,
            )
        except Exception as e:
            return Response(
                {"detail": f"Failed to send email. Please check SMTP configuration. Error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"detail": f"A 6-digit OTP has been sent to {email}."})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").lower().strip()
        otp = request.data.get("otp", "").strip()
        password = request.data.get("password", "")

        if not email or not otp or not password:
            return Response(
                {"detail": "Email, OTP, and new password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(password) < 8:
            return Response(
                {"detail": "Password must be at least 8 characters long."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cached_otp = cache.get(f"pwd_reset_otp_{email}")
        if not cached_otp or str(cached_otp) != str(otp):
            return Response(
                {"detail": "Invalid or expired OTP. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "No account found with this email."},
                status=status.HTTP_404_NOT_FOUND,
            )

        user.set_password(password)
        user.save(update_fields=["password"])
        cache.delete(f"pwd_reset_otp_{email}")

        return Response({"detail": "Password reset successful. You can now sign in with your new password."})
