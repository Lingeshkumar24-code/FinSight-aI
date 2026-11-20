import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { FloatingAssistant } from "../ai/FloatingAssistant";
import { OnboardingModal } from "../onboarding/OnboardingModal";

export function Layout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div>
        <Topbar />
        <main className="content">
          {children ?? <Outlet />}
        </main>
      </div>
      <FloatingAssistant />
      <OnboardingModal />
    </div>
  );
}
