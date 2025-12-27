import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserByClerkId } from "@/lib/db/queries/users";
import { getActiveSubscriptionByUserId } from "@/lib/db/queries/subscriptions";
import { SubscriptionCard } from "./subscription-card";
import { User, LinkIcon } from "lucide-react";

export default async function SettingsPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const dbUser = await getUserByClerkId(user.id);
  const subscription = dbUser ? await getActiveSubscriptionByUserId(dbUser.id) : null;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="mb-8 text-3xl font-bold text-white">Settings</h1>
      <div className="space-y-6">
        {/* Profile Section */}
        <div className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-white/10">
              <User className="w-5 h-5 text-white/80" />
            </div>
            <h2 className="text-xl font-semibold text-white">Profile</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center border border-white/20">
                <span className="text-lg font-medium text-white">
                  {user.firstName?.[0] || user.emailAddresses[0]?.emailAddress[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-white">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-sm text-gray-400">
                  {user.emailAddresses[0]?.emailAddress}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Section */}
        <SubscriptionCard
          subscription={subscription ?? null}
          hasStripeCustomer={!!dbUser?.stripeCustomerId}
        />

        {/* Quick Links */}
        <div className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-white/10">
              <LinkIcon className="w-5 h-5 text-white/80" />
            </div>
            <h2 className="text-xl font-semibold text-white">Quick Links</h2>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/pricing"
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200"
            >
              View Pricing Plans
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
