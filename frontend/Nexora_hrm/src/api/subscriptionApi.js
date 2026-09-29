import { request } from "./apiClient";

/** Fetch all active plans from the backend */
export function getPlans() {
  return request("/subscription/plans/");
}

/** Subscribe the logged-in user to a plan by plan ID */
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
