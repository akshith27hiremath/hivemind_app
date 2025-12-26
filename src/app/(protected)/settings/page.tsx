import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserByClerkId } from "@/lib/db/queries/users";
import { getActiveSubscriptionByUserId } from "@/lib/db/queries/subscriptions";
import { SubscriptionCard } from "./subscription-card";

export default async function SettingsPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const dbUser = await getUserByClerkId(user.id);
  const subscription = dbUser ? await getActiveSubscriptionByUserId(dbUser.id) : null;

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Settings</h1>
      <div className="space-y-6">
        {/* Profile Section */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Profile</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Email:</span>{" "}
              {user.emailAddresses[0]?.emailAddress}
            </p>
            <p>
              <span className="font-medium">Name:</span> {user.firstName}{" "}
              {user.lastName}
            </p>
          </div>
        </div>

        {/* Subscription Section */}
        <SubscriptionCard
          subscription={subscription}
          hasStripeCustomer={!!dbUser?.stripeCustomerId}
        />

        {/* Quick Links */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Quick Links</h2>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/pricing"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              View Pricing Plans
            </Link>
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
