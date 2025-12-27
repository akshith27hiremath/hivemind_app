import { useState } from "react";
import { LandingPage } from "./components/LandingPage";
import { LoginPage } from "./components/LoginPage";
import { Dashboard } from "./components/Dashboard";

type AppState = "landing" | "login" | "dashboard";

export default function App() {
  const [appState, setAppState] = useState<AppState>("landing");

  return (
    <div className="dark">
      {appState === "landing" && (
        <LandingPage onGetStarted={() => setAppState("login")} />
      )}
      {appState === "login" && (
        <LoginPage onLogin={() => setAppState("dashboard")} />
      )}
      {appState === "dashboard" && <Dashboard />}
    </div>
  );
}
