import { request } from "./apiClient";

/** Fetch all active plans from the backend */
export function getPlans() {
  return request("/subscription/plans/");
}

/** Subscribe directly (manual/test) */
export function subscribeToPlan(planId) {
  return request("/subscription/subscribe/", {
    method: "POST",
    body: JSON.stringify({ plan_id: planId }),
  });
}

/** Fetch the logged-in user's current subscription */
export function getMySubscription() {
  return request("/subscription/me/");
}

/** Fetch the logged-in user's payment history */
export function getPaymentHistory() {
  return request("/subscription/payments/");
}

/** Get Stripe public config (key, currency, is_configured) */
export function getStripeConfig() {
  return request("/subscription/stripe/config/");
}

/** Initialize Stripe Checkout session for a plan */
export function createStripeCheckoutSession(planId) {
  return request("/subscription/stripe/create-checkout-session/", {
    method: "POST",
    body: JSON.stringify({ plan_id: planId }),
  });
}

/** Verify Stripe payment session after redirect or simulation */
export function verifyStripeSession(sessionId, planId) {
  return request("/subscription/stripe/verify-session/", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, plan_id: planId }),
  });
}
