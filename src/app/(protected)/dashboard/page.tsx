import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  let user;
  try {
    user = await currentUser();
  } catch (error) {
    console.error("Clerk currentUser error:", error);
    redirect("/sign-in");
  }

  if (!user) {
    redirect("/sign-in");
  }

  const firstName = user.firstName || user.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "there";

  return (
    <div className="min-h-[80vh]">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-gray-500">
          Here&apos;s an overview of your investment tracking
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Portfolios Card */}
        <Link
          href="/dashboard/portfolios"
          className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-emerald-200"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="mb-4 inline-flex rounded-lg bg-emerald-100 p-3">
              <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
              Portfolios
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage your investment portfolios and track holdings
            </p>
            <div className="mt-4 flex items-center text-sm font-medium text-emerald-600">
              View portfolios
              <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Pricing Card */}
        <Link
          href="/pricing"
          className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-blue-200"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="mb-4 inline-flex rounded-lg bg-blue-100 p-3">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
              Subscription
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Upgrade to Pro for unlimited portfolios and features
            </p>
            <div className="mt-4 flex items-center text-sm font-medium text-blue-600">
              View plans
              <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Stocks Card */}
        <Link
          href="/dashboard/stocks"
          className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-purple-200"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="mb-4 inline-flex rounded-lg bg-purple-100 p-3">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
              Stocks
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Browse S&P 500 stocks with real-time charts and data
            </p>
            <div className="mt-4 flex items-center text-sm font-medium text-purple-600">
              Browse stocks
              <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Settings Card */}
        <Link
          href="/settings"
          className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-gray-300"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="mb-4 inline-flex rounded-lg bg-gray-100 p-3">
              <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
              Settings
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage your account and preferences
            </p>
            <div className="mt-4 flex items-center text-sm font-medium text-gray-600">
              Open settings
              <svg className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      {/* Getting Started Section */}
      <div className="mt-12 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-600">
              1
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Create a portfolio</h3>
              <p className="text-sm text-gray-500">
                Start by creating your first portfolio to organize your investments
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-600">
              2
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Add your holdings</h3>
              <p className="text-sm text-gray-500">
                Add stocks from the S&P 500 with quantity and purchase price
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-600">
              3
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Track performance</h3>
              <p className="text-sm text-gray-500">
                Monitor your portfolio value and gain/loss over time
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
