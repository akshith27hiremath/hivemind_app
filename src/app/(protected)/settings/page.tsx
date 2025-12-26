import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Settings</h1>
      <div className="space-y-6">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Profile</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Email:</span> {user.emailAddresses[0].emailAddress}
            </p>
            <p>
              <span className="font-medium">Name:</span> {user.firstName} {user.lastName}
            </p>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Subscription</h2>
          <p className="text-gray-600">You are currently on the Free plan.</p>
          <button className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Upgrade to Pro
          </button>
        </div>
      </div>
    </div>
  );
}
