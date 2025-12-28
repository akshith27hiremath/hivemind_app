"use client";

import { useState, useEffect } from "react";
import { Check, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "Basic portfolio tracking",
    features: [
      "1 portfolio",
      "Manual transaction entry",
      "Basic analytics",
      "CSV import (limited)",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 5,
    description: "Advanced portfolio management",
    features: [
      "Unlimited portfolios",
      "Zerodha CSV import",
      "Advanced analytics",
      "Performance tracking",
      "Export reports",
      "Priority support",
    ],
    popular: true,
  },
];

type SubscriptionStatus = {
  hasSubscription: boolean;
  status?: string;
  plan?: string;
};

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    async function checkSubscription() {
      try {
        const response = await fetch("/api/subscription/status");
        if (response.ok) {
          const data = await response.json();
          setSubscription(data);
        }
      } catch (error) {
        console.error("Failed to check subscription:", error);
      } finally {
        setCheckingStatus(false);
      }
    }
    checkSubscription();
  }, []);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned:", data.error);
        alert(data.error || "Failed to create checkout session");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No portal URL returned:", data.error);
        alert(data.error || "Failed to open billing portal");
      }
    } catch (error) {
      console.error("Portal error:", error);
      alert("Failed to open billing portal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isCurrentPlan = (planId: string) => {
    if (checkingStatus) return false;
    if (planId === "pro") {
      return subscription?.hasSubscription && subscription?.status === "active";
    }
    return !subscription?.hasSubscription;
  };

  const getButtonText = (planId: string) => {
    if (checkingStatus) return "Loading...";
    if (isCurrentPlan(planId)) return "Current Plan";
    if (planId === "pro") {
      if (subscription?.hasSubscription && subscription?.status !== "active") {
        return "Reactivate";
      }
      return "Upgrade to Pro";
    }
    return "Downgrade";
  };

  const getButtonAction = (planId: string) => {
    if (isCurrentPlan(planId)) return undefined;
    if (planId === "pro") return handleUpgrade;
    if (subscription?.hasSubscription) return handleManageSubscription;
    return undefined;
  };

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div
        className="mb-12 text-center"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold text-white mb-3">Pricing</h1>
        <p className="text-gray-400 text-lg">
          Choose the plan that works best for you
        </p>
      </motion.div>

      <div className="grid gap-8 md:grid-cols-2">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            className={`relative rounded-2xl backdrop-blur-xl bg-white/5 border p-8 ${
              plan.popular
                ? "border-blue-500/50 shadow-lg shadow-blue-500/10"
                : "border-white/10"
            } ${
              isCurrentPlan(plan.id) ? "ring-2 ring-green-500/50" : ""
            }`}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-1.5 text-xs font-semibold text-white">
                  <Sparkles className="w-3 h-3" />
                  Most Popular
                </span>
              </div>
            )}
            {isCurrentPlan(plan.id) && (
              <div className="absolute -top-3 right-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 border border-green-500/30 px-3 py-1 text-xs font-semibold text-green-400">
                  <Zap className="w-3 h-3" />
                  Active
                </span>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">{plan.name}</h2>
              <p className="text-gray-400">{plan.description}</p>
            </div>

            <div className="mb-8">
              <span className="text-5xl font-bold text-white">
                {plan.price === 0 ? "Free" : `$${plan.price}`}
              </span>
              {plan.price > 0 && (
                <span className="text-gray-500 ml-2">/month</span>
              )}
            </div>

            <ul className="space-y-4 mb-8">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <div className={`rounded-full p-1 ${plan.popular ? "bg-blue-500/20" : "bg-white/10"}`}>
                    <Check className={`h-4 w-4 ${plan.popular ? "text-blue-400" : "text-green-400"}`} />
                  </div>
                  <span className="text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className={`w-full ${
                plan.popular && !isCurrentPlan(plan.id)
                  ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0"
                  : "bg-white/5 border-white/20 text-white hover:bg-white/10"
              }`}
              variant={plan.popular && !isCurrentPlan(plan.id) ? "default" : "outline"}
              disabled={isCurrentPlan(plan.id) || loading || checkingStatus}
              onClick={getButtonAction(plan.id)}
            >
              {loading ? "Loading..." : getButtonText(plan.id)}
            </Button>
          </motion.div>
        ))}
      </div>

      {subscription?.hasSubscription && (
        <motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="link"
            onClick={handleManageSubscription}
            disabled={loading}
            className="text-gray-400 hover:text-white"
          >
            Manage Billing & Subscription
          </Button>
        </motion.div>
      )}
    </div>
  );
}
