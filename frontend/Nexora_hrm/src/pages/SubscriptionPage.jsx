import React, { useEffect, useState, useCallback } from "react";
import {
  Check,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  Sparkles,
  Clock,
  AlertCircle,
  ExternalLink,
  Lock,
  X,
  RefreshCw,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import "./SubscriptionPage.css";
import {
  getPlans,
  getMySubscription,
  getPaymentHistory,
  createStripeCheckoutSession,
  verifyStripeSession,
  getStripeConfig,
} from "../api/subscriptionApi";

const PLAN_FEATURES = {
  basic: [
    "Up to 25 Active Employees",
    "Real-time Attendance Tracking",
    "Standard Leave Request Workflow",
    "Monthly Payroll Generation",
    "Standard Email Support",
  ],
  professional: [
    "Up to 150 Active Employees",
    "Advanced Attendance & Timesheets",
    "Multi-level Leave Approvals",
    "Automated Payroll & Tax Deductions",
    "Department & Role Permissions",
    "Recruitment & Candidate Pipeline",
    "Priority 24/7 Support",
  ],
  enterprise: [
    "Unlimited Employee Records",
    "Custom Department Hierarchy",
    "Full Automated Payroll & Payslips",
    "Advanced HR Analytics & Reports",
    "Custom Recruitment Pipelines",
    "Dedicated Account Manager",
    "99.9% Uptime SLA & Custom SLA",
  ],
};

export default function SubscriptionPage() {
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [payments, setPayments] = useState([]);
  const [stripeConfig, setStripeConfig] = useState(null);

  const [loading, setLoading] = useState(true);
  const [subscribingId, setSubscribingId] = useState(null);
  const [verifyingSession, setVerifyingSession] = useState(false);
  const [message, setMessage] = useState(null);

  // Modal for Stripe Test Simulation when keys are not configured in .env
  const [testModal, setTestModal] = useState({
    open: false,
    plan: null,
    sessionId: null,
  });

  const loadData = useCallback(async () => {
    try {
      const [plansRes, subRes, historyRes, cfgRes] = await Promise.allSettled([
        getPlans(),
        getMySubscription(),
        getPaymentHistory(),
        getStripeConfig(),
      ]);

      if (plansRes.status === "fulfilled") {
        setPlans(plansRes.value || []);
      }
      if (subRes.status === "fulfilled" && subRes.value?.plan) {
        setCurrentSubscription(subRes.value);
      } else {
        setCurrentSubscription(null);
      }
      if (historyRes.status === "fulfilled") {
        setPayments(historyRes.value || []);
      }
      if (cfgRes.status === "fulfilled") {
        setStripeConfig(cfgRes.value || null);
      }
    } catch (err) {
      console.error("Error loading subscription data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle return from Stripe Checkout (success or cancelled in query params)
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const paymentStatus = queryParams.get("payment_status");
    const sessionId = queryParams.get("session_id");
    const planId = queryParams.get("plan_id");

    if (paymentStatus === "success" && sessionId) {
      setVerifyingSession(true);
      verifyStripeSession(sessionId, planId)
        .then((res) => {
          setMessage({
            type: "success",
            text:
              res.message ||
              "Payment verified successfully! Your subscription is now active.",
          });
          if (res.subscription) {
            setCurrentSubscription(res.subscription);
          }
          // Refresh list of payments
          getPaymentHistory().then(setPayments).catch(() => {});
        })
        .catch((err) => {
          setMessage({
            type: "error",
            text:
              err.message ||
              "Could not verify Stripe payment. Please contact support.",
          });
        })
        .finally(() => {
          setVerifyingSession(false);
          // Remove query params from browser URL without page reload
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        });
    } else if (paymentStatus === "cancelled") {
      setMessage({
        type: "error",
        text: "Stripe checkout was cancelled. No charges were made to your card.",
      });
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }

    loadData();
  }, [loadData]);

  // Initiate Stripe Checkout for a selected plan
  const handleInitiatePayment = async (plan) => {
    setSubscribingId(plan.id);
    setMessage(null);

    try {
      const res = await createStripeCheckoutSession(plan.id);

      if (res.checkout_url) {
        // Real Stripe Checkout redirect
        setMessage({
          type: "info",
          text: "Redirecting to Stripe's secure checkout page...",
        });
        window.location.href = res.checkout_url;
      } else if (res.is_mock) {
        // Fallback simulation mode
        setTestModal({
          open: true,
          plan,
          sessionId: res.session_id,
        });
      } else {
        setMessage({
          type: "error",
          text: "Unexpected response from payment server.",
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Failed to initialize Stripe payment.",
      });
    } finally {
      setSubscribingId(null);
    }
  };

  // Complete simulated payment in test mode
  const handleConfirmTestPayment = async () => {
    if (!testModal.plan || !testModal.sessionId) return;
    setSubscribingId(testModal.plan.id);

    try {
      const res = await verifyStripeSession(
        testModal.sessionId,
        testModal.plan.id
      );
      setTestModal({ open: false, plan: null, sessionId: null });
      setMessage({
        type: "success",
        text:
          res.message ||
          `🎉 Successfully subscribed to ${testModal.plan.name} via Stripe!`,
      });
      if (res.subscription) {
        setCurrentSubscription(res.subscription);
      }
      // Reload updated payments and subscription status
      loadData();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Failed to confirm test payment.",
      });
    } finally {
      setSubscribingId(null);
    }
  };

  const getFeatures = (planName) => {
    const key = (planName || "").toLowerCase();
    if (key.includes("basic") || key.includes("starter")) return PLAN_FEATURES.basic;
    if (key.includes("enterprise") || key.includes("ultimate")) return PLAN_FEATURES.enterprise;
    return PLAN_FEATURES.professional;
  };

  const isPopular = (name) =>
    name?.toLowerCase().includes("professional") ||
    name?.toLowerCase().includes("premium");

  const isCurrentPlan = (plan) =>
    currentSubscription?.plan?.id === plan.id && currentSubscription?.is_active;

  // Calculate days remaining
  const getDaysRemaining = (endDateStr) => {
    if (!endDateStr) return 0;
    const end = new Date(endDateStr);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  if (loading) {
    return (
      <div className="subscription-page">
        <div className="sub-loading-container">
          <RefreshCw className="sub-spinner" size={32} />
          <p>Loading subscription plans and Stripe gateway...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="subscription-page">
      {/* Header */}
      <div className="subscription-header">
        <div className="stripe-live-pill">
          <CreditCard size={14} />
          <span>Payment using stripe</span>
        </div>
        <h1>Plans & Subscriptions</h1>
        <p>Choose the ideal plan for your organization with secure Stripe billing.</p>
      </div>

      {/* Verification overlay / status */}
      {verifyingSession && (
        <div className="subscription-message info">
          <RefreshCw className="sub-spinner" size={16} />
          Verifying your Stripe payment session. Please do not close this window...
        </div>
      )}

      {/* Global alert message */}
      {message && (
        <div className={`subscription-message ${message.type}`}>
          {message.type === "success" && <CheckCircle2 size={18} />}
          {message.type === "error" && <AlertCircle size={18} />}
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="sub-msg-close-btn"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Current Subscription Active Banner */}
      {currentSubscription?.is_active && (
        <div className="current-sub-card">
          <div className="current-sub-left">
            <div className="current-sub-badge">
              Active Subscription
            </div>
            <h2>{currentSubscription.plan.name} Plan</h2>
            <p className="current-sub-meta">
              <Calendar size={15} />
              Valid until:{" "}
              <strong>
                {new Date(currentSubscription.end_date).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </strong>
            </p>
          </div>
          <div className="current-sub-right">
            <div className="days-chip">
              <Clock size={15} />
              <span>{getDaysRemaining(currentSubscription.end_date)} Days Left</span>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Pricing Grid */}
      <div className="subscription-container">
        {plans.map((plan) => {
          const popular = isPopular(plan.name);
          const current = isCurrentPlan(plan);
          const features = getFeatures(plan.name);

          return (
            <div
              key={plan.id}
              className={`subscription-card ${popular ? "popular-plan" : ""} ${
                current ? "current-plan" : ""
              }`}
            >
              {popular && (
                <div className="popular-badge">
                  <Sparkles size={13} style={{ marginRight: 4 }} />
                  Most Popular
                </div>
              )}
              {current && (
                <div className="current-badge">
                  <Check size={13} style={{ marginRight: 4 }} />
                  Current Active Plan
                </div>
              )}

              <div className="card-top-content">
                <h3 className="plan-title">{plan.name}</h3>

                <div className="plan-price">
                  <span className="currency-symbol">₹</span>
                  <span className="price-amount">
                    {parseFloat(plan.price).toLocaleString("en-IN")}
                  </span>
                  <span className="price-term">
                    /{plan.duration_months === 1 ? "month" : `${plan.duration_months} mos`}
                  </span>
                </div>

                <p className="plan-desc">
                  {plan.description ||
                    "Full access to Nexora HRM suite with automatic updates and continuous cloud backup."}
                </p>

                <div className="features-divider" />

                <ul className="plan-features-list">
                  {features.map((feat, i) => (
                    <li key={i}>
                      <span className="feat-check">
                        <Check size={14} />
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleInitiatePayment(plan)}
                className={`subscribe-btn ${popular ? "btn-popular" : ""} ${
                  current ? "btn-current" : ""
                }`}
                disabled={subscribingId === plan.id || current}
              >
                {subscribingId === plan.id ? (
                  <>
                    <RefreshCw className="sub-spinner" size={16} />
                    Processing with Stripe...
                  </>
                ) : current ? (
                  <>
                    <Check size={16} />
                    Active Plan
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    Pay with Stripe
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Stripe Trust Badges */}
      <div className="stripe-trust-bar">
        <div className="trust-item">
          <ShieldCheck size={18} className="trust-icon" />
          <div>
            <strong>Stripe 256-Bit SSL</strong>
            <span>Bank-grade encryption</span>
          </div>
        </div>
        <div className="trust-item">
          <CreditCard size={18} className="trust-icon" />
          <div>
            <strong>All Cards Supported</strong>
            <span>Visa, Mastercard, RuPay & Amex</span>
          </div>
        </div>
        <div className="trust-item">
          <Lock size={18} className="trust-icon" />
          <div>
            <strong>Instant Activation</strong>
            <span>Access unlocked immediately</span>
          </div>
        </div>
      </div>

      {/* Payment & Billing History Section */}
      {/* <div className="billing-history-section">
        <div className="billing-header">
          <div>
            <h2>Payment & Invoice History</h2>
            <p>Records of all transactions processed via Stripe gateway.</p>
          </div>
          <button onClick={loadData} className="refresh-history-btn" title="Refresh records">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {payments.length === 0 ? (
          <div className="empty-billing-state">
            <CreditCard size={36} />
            <p>No billing transactions found yet.</p>
            <small>Once you subscribe via Stripe, your payment receipts will appear here.</small>
          </div>
        ) : (
          <div className="billing-table-wrapper">
            <table className="billing-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Plan</th>
                  <th>Transaction / Stripe ID</th>
                  <th>Gateway</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((pmt) => (
                  <tr key={pmt.id}>
                    <td>
                      {new Date(pmt.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="fw-semibold">
                      {pmt.plan_name || "Subscription"}
                    </td>
                    <td>
                      <code className="payment-id-code">
                        {pmt.payment_id || "N/A"}
                      </code>
                    </td>
                    <td>
                      <span className="gateway-badge">
                        <CreditCard size={12} />
                        Stripe
                      </span>
                    </td>
                    <td className="fw-bold">
                      ₹{parseFloat(pmt.amount).toLocaleString("en-IN")}
                    </td>
                    <td>
                      <span className={`status-badge ${pmt.status}`}>
                        {pmt.status === "success" && <Check size={12} />}
                        {pmt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div> */}

      {/* Stripe Test Simulation Modal (when keys are in test simulation) */}
      {testModal.open && testModal.plan && (
        <div className="stripe-modal-backdrop">
          <div className="stripe-modal">
            <div className="stripe-modal-header">
              <div className="stripe-modal-logo">
                <CreditCard size={20} color="#635bff" />
                <span>Stripe Checkout (Simulation Mode)</span>
              </div>
              <button
                onClick={() => setTestModal({ open: false, plan: null, sessionId: null })}
                className="stripe-modal-close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="stripe-modal-body">
              <div className="stripe-order-summary">
                <div>
                  <span className="summary-label">Selected Plan</span>
                  <strong className="summary-value">{testModal.plan.name}</strong>
                </div>
                <div>
                  <span className="summary-label">Total Amount</span>
                  <strong className="summary-value price-highlight">
                    ₹{parseFloat(testModal.plan.price).toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>

              <div className="test-card-preview">
                <div className="test-card-header">
                  <span>STRIPE TEST CARD</span>
                  <span className="test-card-chip" />
                </div>
                <div className="test-card-number">4242 •••• •••• 4242</div>
                <div className="test-card-footer">
                  <span>CARDHOLDER: NEXORA ADMIN</span>
                  <span>EXP: 12/28</span>
                </div>
              </div>

              <div className="stripe-test-notice">
                <AlertCircle size={16} />
                <p>
                  <strong>Test Mode Active:</strong> You can simulate completing this
                  payment to test instant plan activation. To connect your live Stripe
                  Checkout, set <code>STRIPE_SECRET_KEY</code> in <code>Backend/.env</code>.
                </p>
              </div>
            </div>

            <div className="stripe-modal-footer">
              <button
                onClick={() => setTestModal({ open: false, plan: null, sessionId: null })}
                className="btn-modal-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTestPayment}
                className="btn-modal-pay"
                disabled={subscribingId === testModal.plan.id}
              >
                {subscribingId === testModal.plan.id ? (
                  <>
                    <RefreshCw className="sub-spinner" size={15} />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Complete Stripe Payment (₹{testModal.plan.price})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}