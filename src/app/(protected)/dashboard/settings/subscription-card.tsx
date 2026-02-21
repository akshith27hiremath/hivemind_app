"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreditCard, Sparkles } from "lucide-react";
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
    <div className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-white/10">
          <CreditCard className="w-5 h-5 text-white/80" />
        </div>
        <h2 className="text-xl font-semibold text-white">Subscription</h2>
      </div>

      {subscription ? (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  subscription.status === "active"
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : subscription.status === "past_due"
                      ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                      : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                }`}
              >
                {subscription.status.charAt(0).toUpperCase() +
                  subscription.status.slice(1)}
              </span>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="font-medium text-white">Pro Plan</span>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="text-gray-400">
                <span className="text-white/80">Current Period:</span>{" "}
                {formatDate(subscription.currentPeriodStart)} -{" "}
                {formatDate(subscription.currentPeriodEnd)}
              </p>
              {subscription.cancelAtPeriodEnd && (
                <p className="text-yellow-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  Your subscription will cancel at the end of the current period.
                </p>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleManageSubscription}
            disabled={loading}
            className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white"
          >
            {loading ? "Loading..." : "Manage Subscription"}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-gray-400">
              You are currently on the{" "}
              <span className="text-white font-medium">Free</span> plan.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Upgrade to Pro for unlimited portfolios, CSV import, and advanced analytics.
            </p>
          </div>
          <div className="flex gap-4">
            <Link href="/pricing">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0">
                <Sparkles className="w-4 h-4 mr-2" />
                Upgrade to Pro
              </Button>
            </Link>
            {hasStripeCustomer && (
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                disabled={loading}
                className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white"
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
