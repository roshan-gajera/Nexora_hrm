import React, { useEffect, useState } from "react";
import "./SubscriptionPage.css";
import { getPlans, subscribeToPlan, getMySubscription } from "../api/subscriptionApi";

const SubscriptionPage = () => {
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansData, subData] = await Promise.allSettled([
          getPlans(),
          getMySubscription(),
        ]);

        if (plansData.status === "fulfilled") {
          setPlans(plansData.value);
        }

        if (subData.status === "fulfilled" && subData.value?.plan) {
          setCurrentSubscription(subData.value);
        }
      } catch (err) {
        console.error("Failed to load subscription data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubscribe = async (plan) => {
    setSubscribing(plan.id);
    setMessage(null);

    try {
      const result = await subscribeToPlan(plan.id);
      setCurrentSubscription(result);
      setMessage({
        type: "success",
        text: `🎉 Successfully subscribed to the ${plan.name} plan!`,
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.message || "Subscription failed. Please try again.",
      });
    } finally {
      setSubscribing(null);
    }
  };

  const isPopular = (name) =>
    name?.toLowerCase().includes("professional") ||
    name?.toLowerCase().includes("premium");

  const isCurrentPlan = (plan) =>
    currentSubscription?.plan?.id === plan.id &&
    currentSubscription?.is_active;

  if (loading) {
    return (
      <div className="subscription-page">
        <div className="subscription-header">
          <h1>Choose Your Plan</h1>
          <p>Loading available plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="subscription-page">
      <div className="subscription-header">
        <h1>Choose Your Plan</h1>
        <p>Select a subscription plan that fits your organization's needs.</p>
      </div>

      {currentSubscription?.is_active && (
        <div className="current-plan-banner">
          ✅ You are currently on the <strong>{currentSubscription.plan.name}</strong> plan,active until <strong>{new Date(currentSubscription.end_date).toLocaleDateString()}</strong>.
        </div>
      )}

      {message && (
        <div className={`subscription-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="subscription-container">
        {plans.map((plan) => (
          <div className={`subscription-card ${isPopular(plan.name) ? "popular-plan" : ""} ${isCurrentPlan(plan) ? "current-plan" : ""}`} key={plan.id}>
            {isPopular(plan.name) && (
              <div className="popular-badge">Most Popular</div>
            )}
            {isCurrentPlan(plan) && (
              <div className="current-badge">Current Plan</div>
            )}

            <h2>{plan.name}</h2>

            <div className="plan-price">
              <span>₹{parseFloat(plan.price).toLocaleString("en-IN")}</span>
              <small>
                /{plan.duration_months === 1 ? "month" : `${plan.duration_months} months`}
              </small>
            </div>

            {plan.description && (
              <p className="plan-description">{plan.description}</p>
            )}

            <button onClick={() => handleSubscribe(plan)} className="subscribe-btn" disabled={subscribing === plan.id || !!currentSubscription?.is_active} >
              {subscribing === plan.id
                ? "Processing..."
                : isCurrentPlan(plan)
                ? "Current Plan"
                : "Subscribe"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPage;