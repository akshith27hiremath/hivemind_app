import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

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

  return (
    <div className="p-8">
      <h1 className="mb-4 text-3xl font-bold">Dashboard</h1>
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <p className="text-lg">
          Welcome, <span className="font-semibold">{user.firstName || user.emailAddresses[0].emailAddress}</span>!
        </p>
        <p className="mt-2 text-gray-600">You are now authenticated with Clerk.</p>
      </div>
    </div>
  );
}
