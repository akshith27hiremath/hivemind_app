"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Pricing</h1>
        <p className="mt-2 text-gray-600">
          Choose the plan that works best for you
        </p>
      </div>

      <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative ${plan.popular ? "border-blue-500 shadow-lg" : ""} ${
              isCurrentPlan(plan.id) ? "ring-2 ring-green-500" : ""
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              </div>
            )}
            {isCurrentPlan(plan.id) && (
              <div className="absolute -top-3 right-4">
                <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-semibold text-white">
                  Active
                </span>
              </div>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">
                  {plan.price === 0 ? "Free" : `$${plan.price}`}
                </span>
                {plan.price > 0 && (
                  <span className="text-gray-500">/month</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={plan.popular && !isCurrentPlan(plan.id) ? "default" : "outline"}
                disabled={isCurrentPlan(plan.id) || loading || checkingStatus}
                onClick={getButtonAction(plan.id)}
              >
                {loading ? "Loading..." : getButtonText(plan.id)}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {subscription?.hasSubscription && (
        <div className="mt-8 text-center">
          <Button variant="link" onClick={handleManageSubscription} disabled={loading}>
            Manage Billing & Subscription
          </Button>
        </div>
      )}
    </div>
  );
}
