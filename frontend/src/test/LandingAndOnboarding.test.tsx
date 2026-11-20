import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import { LandingPage } from "../pages/LandingPage";
import { OnboardingModal } from "../components/onboarding/OnboardingModal";

describe("LandingPage and OnboardingModal", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders LandingPage with Agama-style sections, hero and features", () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    // Hero title & badge
    expect(
      screen.getByText(/One Intelligent Financial Command Center for Your Business/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Run your enterprise finances from one/i)
    ).toBeInTheDocument();

    // Live dashboard metrics preview
    expect(screen.getByText(/NET PROFIT MARGIN/i)).toBeInTheDocument();
    expect(screen.getByText(/CLOSING CASH BUFFER/i)).toBeInTheDocument();
    expect(screen.getByText(/DEBT BURDEN \(EMI\)/i)).toBeInTheDocument();

    // Feature highlights
    expect(
      screen.getByText(/Agentic RAG Document Ingestion/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Candlestick Market Intelligence/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Causal What-If Scenario Simulator/i)
    ).toBeInTheDocument();

    // Guided tour and Sign In CTAs
    expect(screen.getAllByText(/Guided Tour/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Sign In to Portal/i)[0]).toBeInTheDocument();
  });

  it("opens OnboardingModal and steps through all 6 product tour steps", () => {
    render(<OnboardingModal forceOpen={true} />);

    // Step 1: Dashboard
    expect(
      screen.getByText(/Financial Performance & Liquidity Overview/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 6/i)).toBeInTheDocument();

    // Click Next -> Step 2: Upload Docs
    fireEvent.click(screen.getByRole("button", { name: /Next →/i }));
    expect(
      screen.getByText(/20\+ Sheet Excel & Multi-Format Document Ingestion/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();

    // Click Next -> Step 3: AI Advisor
    fireEvent.click(screen.getByRole("button", { name: /Next →/i }));
    expect(
      screen.getByText(/Agentic RAG Debt & Surplus Capital Advisory/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Step 3 of 6/i)).toBeInTheDocument();

    // Click Next -> Step 4: What-If Simulator
    fireEvent.click(screen.getByRole("button", { name: /Next →/i }));
    expect(
      screen.getByText(/Causal Financial Simulation Engine/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Step 4 of 6/i)).toBeInTheDocument();

    // Click Next -> Step 5: Market Intelligence
    fireEvent.click(screen.getByRole("button", { name: /Next →/i }));
    expect(
      screen.getByText(/Real-Time Candlestick Charts & Technical Analysis/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Step 5 of 6/i)).toBeInTheDocument();

    // Click Next -> Step 6: Fraud Shield & Automations
    fireEvent.click(screen.getByRole("button", { name: /Next →/i }));
    expect(
      screen.getByText(/Forensic Audit & Automated Background Alerts/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Step 6 of 6/i)).toBeInTheDocument();

    // Complete tour
    fireEvent.click(screen.getByRole("button", { name: /Get Started 🚀/i }));
    expect(localStorage.getItem("finsight_tour_completed")).toBe("true");
  });
});
