"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Subscription } from "@/lib/db/schema";

interface SubscriptionCardProps {
  subscription: Subscription | null;
  hasStripeCustomer: boolean;
}

export function SubscriptionCard({
  subscription,
  hasStripeCustomer,
}: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false);

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
        console.error("No portal URL returned");
      }
    } catch (error) {
      console.error("Portal error:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold">Subscription</h2>

      {subscription ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                subscription.status === "active"
                  ? "bg-green-100 text-green-800"
                  : subscription.status === "past_due"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
              }`}
            >
              {subscription.status.charAt(0).toUpperCase() +
                subscription.status.slice(1)}
            </span>
            <span className="font-medium">Pro Plan</span>
          </div>

          <div className="space-y-1 text-sm text-gray-600">
            <p>
              <span className="font-medium">Current Period:</span>{" "}
              {formatDate(subscription.currentPeriodStart)} -{" "}
              {formatDate(subscription.currentPeriodEnd)}
            </p>
            {subscription.cancelAtPeriodEnd && (
              <p className="text-yellow-600">
                Your subscription will cancel at the end of the current period.
              </p>
            )}
          </div>

          <Button
            variant="outline"
            onClick={handleManageSubscription}
            disabled={loading}
          >
            {loading ? "Loading..." : "Manage Subscription"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-600">
            You are currently on the <strong>Free</strong> plan.
          </p>
          <div className="flex gap-4">
            <Link href="/pricing">
              <Button>Upgrade to Pro</Button>
            </Link>
            {hasStripeCustomer && (
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                disabled={loading}
              >
                {loading ? "Loading..." : "Billing History"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
